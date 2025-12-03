import { Module } from '@nestjs/common';
import { UserPhonesService } from './user-phones.service';
import { UserPhonesController } from './user-phones.controller';

@Module({
  providers: [UserPhonesService],
  controllers: [UserPhonesController],
  exports: [UserPhonesService],
})
export class UserPhonesModule {}
