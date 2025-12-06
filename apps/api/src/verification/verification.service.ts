import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PhoneVerificationProvider,
  SendCodeResult,
  VerifyCodeResult,
  PhoneIdentity,
  VerificationResult,
} from './verification-provider.interface';
import { SupabaseVerificationProvider } from './providers/supabase-verification.provider';
import { TwilioVerificationProvider } from './providers/twilio-verification.provider';

export type VerificationProviderType = 'supabase' | 'twilio';

@Injectable()
export class VerificationService implements OnModuleInit {
  private readonly logger = new Logger(VerificationService.name);
  private provider: PhoneVerificationProvider;
  private providers: Map<string, PhoneVerificationProvider> = new Map();

  constructor(
    private configService: ConfigService,
    private supabaseProvider: SupabaseVerificationProvider,
    private twilioProvider: TwilioVerificationProvider,
  ) {
    // Register providers
    this.providers.set('supabase', supabaseProvider);
    this.providers.set('twilio', twilioProvider);
  }

  onModuleInit() {
    // Set default provider from config
    const defaultProvider = this.configService.get<string>(
      'PHONE_VERIFICATION_PROVIDER',
      'twilio', // Default to twilio for more flexibility
    );

    this.provider = this.providers.get(defaultProvider) || this.twilioProvider;
    this.logger.log(`Phone verification provider: ${this.provider.name}`);
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Switch to a different provider at runtime
   */
  setProvider(providerName: VerificationProviderType): boolean {
    const provider = this.providers.get(providerName);
    if (provider) {
      this.provider = provider;
      this.logger.log(`Switched to provider: ${providerName}`);
      return true;
    }
    return false;
  }

  /**
   * Send verification code to phone
   */
  async sendCode(userId: string, phone: string): Promise<SendCodeResult> {
    this.logger.log(`Sending code to ${phone} via ${this.provider.name}`);
    return this.provider.sendCode(userId, phone);
  }

  /**
   * Verify the code
   */
  async verifyCode(
    userId: string,
    phone: string,
    code: string,
  ): Promise<VerifyCodeResult> {
    this.logger.log(`Verifying code for ${phone} via ${this.provider.name}`);
    return this.provider.verifyCode(userId, phone, code);
  }

  /**
   * Get all verified phones for user
   */
  async getVerifiedPhones(userId: string): Promise<PhoneIdentity[]> {
    return this.provider.getVerifiedPhones(userId);
  }

  /**
   * Remove a phone from user
   */
  async removePhone(userId: string, phone: string): Promise<VerificationResult> {
    return this.provider.removePhone(userId, phone);
  }

  /**
   * Check if phone is already in use
   */
  async isPhoneInUse(phone: string, excludeUserId?: string): Promise<boolean> {
    return this.provider.isPhoneInUse(phone, excludeUserId);
  }
}
