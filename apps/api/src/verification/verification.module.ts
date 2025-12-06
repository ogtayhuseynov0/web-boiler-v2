import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VerificationService } from './verification.service';
import { SupabaseVerificationProvider } from './providers/supabase-verification.provider';
import { TwilioVerificationProvider } from './providers/twilio-verification.provider';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [ConfigModule, SupabaseModule],
  providers: [
    VerificationService,
    SupabaseVerificationProvider,
    TwilioVerificationProvider,
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
