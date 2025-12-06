export interface VerificationResult {
  success: boolean;
  error?: string;
  identityId?: string;
}

export interface SendCodeResult {
  success: boolean;
  error?: string;
}

export interface VerifyCodeResult {
  success: boolean;
  error?: string;
  verified?: boolean;
}

export interface PhoneIdentity {
  id: string;
  phone: string;
  provider: string;
  createdAt: Date;
}

export abstract class PhoneVerificationProvider {
  abstract readonly name: string;

  /**
   * Send verification code to phone number
   */
  abstract sendCode(userId: string, phone: string): Promise<SendCodeResult>;

  /**
   * Verify the code entered by user
   */
  abstract verifyCode(
    userId: string,
    phone: string,
    code: string,
  ): Promise<VerifyCodeResult>;

  /**
   * Get all verified phones for a user (if supported by provider)
   */
  abstract getVerifiedPhones(userId: string): Promise<PhoneIdentity[]>;

  /**
   * Remove a phone from user (if supported by provider)
   */
  abstract removePhone(userId: string, phone: string): Promise<VerificationResult>;

  /**
   * Check if a phone is already verified by another user
   */
  abstract isPhoneInUse(phone: string, excludeUserId?: string): Promise<boolean>;
}
