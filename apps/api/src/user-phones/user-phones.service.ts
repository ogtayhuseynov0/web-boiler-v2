import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { VerificationService } from '../verification/verification.service';

export interface UserPhone {
  id: string;
  user_id: string;
  phone_number: string;
  is_verified: boolean;
  is_primary: boolean;
  created_at: string;
}

@Injectable()
export class UserPhonesService {
  private readonly logger = new Logger(UserPhonesService.name);

  constructor(
    private supabaseService: SupabaseService,
    private verificationService: VerificationService,
  ) {}

  async getUserPhones(userId: string): Promise<UserPhone[]> {
    const supabase = this.supabaseService.getClient();

    const { data: phones, error } = await supabase
      .from('user_phones')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch user phones:', error);
      return [];
    }

    return phones || [];
  }

  async addPhone(
    userId: string,
    phoneNumber: string,
  ): Promise<{ success: boolean; error?: string; phone?: UserPhone }> {
    const supabase = this.supabaseService.getClient();

    // Normalize phone number (ensure E.164 format)
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return { success: false, error: 'Invalid phone number format' };
    }

    // Check if phone is already registered
    const { data: existing } = await supabase
      .from('user_phones')
      .select('id, user_id')
      .eq('phone_number', normalizedPhone)
      .single();

    if (existing) {
      if (existing.user_id === userId) {
        return { success: false, error: 'Phone number already added to your account' };
      }
      return { success: false, error: 'Phone number is registered to another account' };
    }

    // Check if user already has phones (to determine if this should be primary)
    const existingPhones = await this.getUserPhones(userId);
    const isPrimary = existingPhones.length === 0;

    // Add phone (unverified)
    const { data: phone, error } = await supabase
      .from('user_phones')
      .insert({
        user_id: userId,
        phone_number: normalizedPhone,
        is_verified: false,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to add phone:', error);
      return { success: false, error: 'Failed to add phone number' };
    }

    return { success: true, phone };
  }

  async sendVerificationCode(
    userId: string,
    phoneId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = this.supabaseService.getClient();

    // Get the phone record
    const { data: phone } = await supabase
      .from('user_phones')
      .select('*')
      .eq('id', phoneId)
      .eq('user_id', userId)
      .single();

    if (!phone) {
      return { success: false, error: 'Phone not found' };
    }

    if (phone.is_verified) {
      return { success: false, error: 'Phone is already verified' };
    }

    // Use the verification service (provider-agnostic)
    const result = await this.verificationService.sendCode(userId, phone.phone_number);

    if (!result.success) {
      this.logger.error(`Failed to send verification code: ${result.error}`);
      return { success: false, error: result.error || 'Failed to send verification code' };
    }

    this.logger.log(`Sent verification code to ${phone.phone_number} via ${this.verificationService.getProviderName()}`);
    return { success: true };
  }

  async verifyCode(
    userId: string,
    phoneId: string,
    code: string,
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = this.supabaseService.getClient();

    // Get the phone record
    const { data: phone } = await supabase
      .from('user_phones')
      .select('*')
      .eq('id', phoneId)
      .eq('user_id', userId)
      .single();

    if (!phone) {
      return { success: false, error: 'Phone not found' };
    }

    // Use the verification service (provider-agnostic)
    const result = await this.verificationService.verifyCode(
      userId,
      phone.phone_number,
      code,
    );

    if (!result.success) {
      return { success: false, error: result.error || 'Invalid verification code' };
    }

    // Mark phone as verified in our database
    const { error } = await supabase
      .from('user_phones')
      .update({ is_verified: true })
      .eq('id', phoneId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to update phone verification status:', error);
      return { success: false, error: 'Failed to verify phone' };
    }

    this.logger.log(`Phone ${phoneId} verified for user ${userId} via ${this.verificationService.getProviderName()}`);
    return { success: true };
  }

  async deletePhone(
    userId: string,
    phoneId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = this.supabaseService.getClient();

    // Check if it's the primary phone
    const { data: phone } = await supabase
      .from('user_phones')
      .select('is_primary')
      .eq('id', phoneId)
      .eq('user_id', userId)
      .single();

    if (!phone) {
      return { success: false, error: 'Phone not found' };
    }

    // Delete the phone
    const { error } = await supabase
      .from('user_phones')
      .delete()
      .eq('id', phoneId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to delete phone:', error);
      return { success: false, error: 'Failed to delete phone' };
    }

    // If it was primary, make another phone primary
    if (phone.is_primary) {
      const { data: otherPhones } = await supabase
        .from('user_phones')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (otherPhones && otherPhones.length > 0) {
        await supabase
          .from('user_phones')
          .update({ is_primary: true })
          .eq('id', otherPhones[0].id);
      }
    }

    return { success: true };
  }

  async setPrimaryPhone(
    userId: string,
    phoneId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = this.supabaseService.getClient();

    // Verify the phone exists and is verified
    const { data: phone } = await supabase
      .from('user_phones')
      .select('is_verified')
      .eq('id', phoneId)
      .eq('user_id', userId)
      .single();

    if (!phone) {
      return { success: false, error: 'Phone not found' };
    }

    if (!phone.is_verified) {
      return { success: false, error: 'Phone must be verified to set as primary' };
    }

    // Unset current primary
    await supabase
      .from('user_phones')
      .update({ is_primary: false })
      .eq('user_id', userId);

    // Set new primary
    const { error } = await supabase
      .from('user_phones')
      .update({ is_primary: true })
      .eq('id', phoneId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to set primary phone:', error);
      return { success: false, error: 'Failed to set primary phone' };
    }

    return { success: true };
  }

  private normalizePhoneNumber(phone: string): string | null {
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
      // Assume US number if no country code
      if (normalized.length === 10) {
        normalized = '+1' + normalized;
      } else if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = '+' + normalized;
      } else {
        normalized = '+' + normalized;
      }
    }

    // Basic validation
    if (normalized.length < 10 || normalized.length > 15) {
      return null;
    }

    return normalized;
  }
}
