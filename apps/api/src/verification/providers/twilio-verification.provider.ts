import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PhoneVerificationProvider,
  SendCodeResult,
  VerifyCodeResult,
  PhoneIdentity,
  VerificationResult,
} from '../verification-provider.interface';
import { SupabaseService } from '../../supabase/supabase.service';
import * as twilio from 'twilio';

@Injectable()
export class TwilioVerificationProvider extends PhoneVerificationProvider {
  readonly name = 'twilio';
  private readonly logger = new Logger(TwilioVerificationProvider.name);
  private twilioClient: twilio.Twilio;
  private verifyServiceSid: string;

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    super();

    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.verifyServiceSid = this.configService.get<string>(
      'TWILIO_VERIFY_SERVICE_SID',
    );

    if (accountSid && authToken) {
      this.twilioClient = twilio.default(accountSid, authToken);
    }
  }

  async sendCode(userId: string, phone: string): Promise<SendCodeResult> {
    try {
      if (!this.twilioClient || !this.verifyServiceSid) {
        return { success: false, error: 'Twilio Verify not configured' };
      }

      const verification = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({
          to: phone,
          channel: 'sms',
        });

      this.logger.log(`Verification sent to ${phone}, status: ${verification.status}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Error sending verification code:', error);
      return {
        success: false,
        error: error.message || 'Failed to send verification code',
      };
    }
  }

  async verifyCode(
    userId: string,
    phone: string,
    code: string,
  ): Promise<VerifyCodeResult> {
    try {
      if (!this.twilioClient || !this.verifyServiceSid) {
        return { success: false, error: 'Twilio Verify not configured' };
      }

      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: phone,
          code,
        });

      if (verificationCheck.status === 'approved') {
        // Update the phone as verified in our database
        await this.markPhoneVerified(userId, phone);
        return { success: true, verified: true };
      }

      return { success: false, error: 'Invalid verification code' };
    } catch (error) {
      this.logger.error('Error verifying code:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify code',
      };
    }
  }

  async getVerifiedPhones(userId: string): Promise<PhoneIdentity[]> {
    try {
      const supabase = this.supabaseService.getAdminClient();

      const { data, error } = await supabase
        .from('user_phones')
        .select('*')
        .eq('user_id', userId)
        .eq('is_verified', true)
        .order('created_at', { ascending: true });

      if (error || !data) {
        return [];
      }

      return data.map((phone) => ({
        id: phone.id,
        phone: phone.phone_number,
        provider: 'twilio',
        createdAt: new Date(phone.created_at),
      }));
    } catch (error) {
      this.logger.error('Error getting verified phones:', error);
      return [];
    }
  }

  async removePhone(userId: string, phone: string): Promise<VerificationResult> {
    try {
      const supabase = this.supabaseService.getAdminClient();

      const { error } = await supabase
        .from('user_phones')
        .delete()
        .eq('user_id', userId)
        .eq('phone_number', phone);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error removing phone:', error);
      return { success: false, error: 'Failed to remove phone' };
    }
  }

  async isPhoneInUse(phone: string, excludeUserId?: string): Promise<boolean> {
    try {
      const supabase = this.supabaseService.getAdminClient();

      let query = supabase
        .from('user_phones')
        .select('id')
        .eq('phone_number', phone)
        .eq('is_verified', true);

      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
      }

      const { data } = await query.limit(1);

      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async markPhoneVerified(userId: string, phone: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    await supabase
      .from('user_phones')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('phone_number', phone);
  }
}
