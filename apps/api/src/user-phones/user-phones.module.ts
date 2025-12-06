import { Module } from '@nestjs/common';
import { UserPhonesService } from './user-phones.service';
import { UserPhonesController } from './user-phones.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [SupabaseModule, VerificationModule],
  providers: [UserPhonesService],
  controllers: [UserPhonesController],
  exports: [UserPhonesService],
})
export class UserPhonesModule {}
