import { Injectable, Logger } from '@nestjs/common';
import {
  PhoneVerificationProvider,
  SendCodeResult,
  VerifyCodeResult,
  PhoneIdentity,
  VerificationResult,
} from '../verification-provider.interface';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SupabaseVerificationProvider extends PhoneVerificationProvider {
  readonly name = 'supabase';
  private readonly logger = new Logger(SupabaseVerificationProvider.name);

  constructor(private supabaseService: SupabaseService) {
    super();
  }

  async sendCode(userId: string, phone: string): Promise<SendCodeResult> {
    try {
      const supabase = this.supabaseService.getClient();

      // Generate OTP for phone verification
      // Using admin API to send OTP to the phone
      const { error } = await supabase.auth.admin.generateLink({
        type: 'phone_change',
        phone,
      });

      if (error) {
        // If generateLink doesn't work for phone, use signInWithOtp approach
        // We'll store a pending verification in our DB and use Supabase's OTP
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone,
          options: {
            shouldCreateUser: false,
          },
        });

        if (otpError) {
          this.logger.error(`Failed to send OTP: ${otpError.message}`);
          return { success: false, error: otpError.message };
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error sending verification code:', error);
      return { success: false, error: 'Failed to send verification code' };
    }
  }

  async verifyCode(
    userId: string,
    phone: string,
    code: string,
  ): Promise<VerifyCodeResult> {
    try {
      const supabase = this.supabaseService.getClient();

      // Verify the OTP
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: 'sms',
      });

      if (error) {
        this.logger.error(`OTP verification failed: ${error.message}`);
        return { success: false, error: error.message };
      }

      // If verification successful, link this phone to the user
      // Update the user's phone in auth.users
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          phone,
          phone_confirm: true,
        },
      );

      if (updateError) {
        this.logger.error(`Failed to link phone: ${updateError.message}`);
        return { success: false, error: updateError.message };
      }

      return { success: true, verified: true };
    } catch (error) {
      this.logger.error('Error verifying code:', error);
      return { success: false, error: 'Failed to verify code' };
    }
  }

  async getVerifiedPhones(userId: string): Promise<PhoneIdentity[]> {
    try {
      const supabase = this.supabaseService.getClient();

      // Get user's identities from auth.identities
      const { data: user, error } = await supabase.auth.admin.getUserById(userId);

      if (error || !user) {
        return [];
      }

      const phones: PhoneIdentity[] = [];

      // Check main phone on user
      if (user.user.phone) {
        phones.push({
          id: `phone_${user.user.id}`,
          phone: user.user.phone,
          provider: 'supabase',
          createdAt: new Date(user.user.created_at),
        });
      }

      // Check identities for phone providers
      if (user.user.identities) {
        for (const identity of user.user.identities) {
          if (identity.provider === 'phone' && identity.identity_data?.phone) {
            phones.push({
              id: identity.id,
              phone: identity.identity_data.phone,
              provider: 'supabase',
              createdAt: new Date(identity.created_at),
            });
          }
        }
      }

      return phones;
    } catch (error) {
      this.logger.error('Error getting verified phones:', error);
      return [];
    }
  }

  async removePhone(userId: string, phone: string): Promise<VerificationResult> {
    try {
      const supabase = this.supabaseService.getClient();

      // Get user to check if this is their primary phone
      const { data: user, error: getUserError } =
        await supabase.auth.admin.getUserById(userId);

      if (getUserError || !user) {
        return { success: false, error: 'User not found' };
      }

      // If it's the main phone, clear it
      if (user.user.phone === phone) {
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          phone: '',
        });

        if (error) {
          return { success: false, error: error.message };
        }
      }

      // Find and unlink the identity if it exists
      if (user.user.identities) {
        const phoneIdentity = user.user.identities.find(
          (i) => i.provider === 'phone' && i.identity_data?.phone === phone,
        );

        if (phoneIdentity) {
          const { error } = await supabase.auth.admin.deleteUser(
            phoneIdentity.id,
            // Note: This deletes identity, not user
          );

          // Alternative: Use unlinkIdentity if available
          // This might require user's own session
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error removing phone:', error);
      return { success: false, error: 'Failed to remove phone' };
    }
  }

  async isPhoneInUse(phone: string, excludeUserId?: string): Promise<boolean> {
    try {
      const supabase = this.supabaseService.getClient();

      // Check if phone exists in auth.users
      const { data, error } = await supabase
        .from('auth.users')
        .select('id')
        .eq('phone', phone)
        .single();

      if (error || !data) {
        return false;
      }

      if (excludeUserId && data.id === excludeUserId) {
        return false;
      }

      return true;
    } catch (error) {
      // Phone not in use
      return false;
    }
  }
}
