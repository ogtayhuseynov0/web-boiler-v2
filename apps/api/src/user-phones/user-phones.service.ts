import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TwilioService } from '../twilio/twilio.service';

export interface UserPhone {
  id: string;
  user_id: string;
  phone_number: string;
  is_verified: boolean;
  is_primary: boolean;
  created_at: string;
}

interface PendingVerification {
  code: string;
  expires_at: number;
  attempts: number;
}

@Injectable()
export class UserPhonesService {
  private readonly logger = new Logger(UserPhonesService.name);
  // In-memory store for verification codes (use Redis in production)
  private verificationCodes: Map<string, PendingVerification> = new Map();

  constructor(
    private supabaseService: SupabaseService,
    private twilioService: TwilioService,
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

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store code
    this.verificationCodes.set(phoneId, {
      code,
      expires_at: expiresAt,
      attempts: 0,
    });

    // Send SMS via Twilio
    const twilioClient = this.twilioService.getClient();
    if (!twilioClient) {
      // For development, log the code instead
      this.logger.log(`[DEV] Verification code for ${phone.phone_number}: ${code}`);
      return { success: true };
    }

    try {
      await twilioClient.messages.create({
        body: `Your Ringy verification code is: ${code}. It expires in 10 minutes.`,
        from: this.twilioService.getPhoneNumber(),
        to: phone.phone_number,
      });

      this.logger.log(`Sent verification code to ${phone.phone_number}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to send SMS:', error);
      return { success: false, error: 'Failed to send verification code' };
    }
  }

  async verifyCode(
    userId: string,
    phoneId: string,
    code: string,
  ): Promise<{ success: boolean; error?: string }> {
    const pending = this.verificationCodes.get(phoneId);

    if (!pending) {
      return { success: false, error: 'No verification code found. Please request a new one.' };
    }

    if (Date.now() > pending.expires_at) {
      this.verificationCodes.delete(phoneId);
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    if (pending.attempts >= 3) {
      this.verificationCodes.delete(phoneId);
      return { success: false, error: 'Too many attempts. Please request a new code.' };
    }

    if (pending.code !== code) {
      pending.attempts++;
      return { success: false, error: 'Invalid verification code' };
    }

    // Code is correct - verify the phone
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('user_phones')
      .update({ is_verified: true })
      .eq('id', phoneId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to verify phone:', error);
      return { success: false, error: 'Failed to verify phone' };
    }

    // Clean up
    this.verificationCodes.delete(phoneId);

    this.logger.log(`Phone ${phoneId} verified for user ${userId}`);
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
