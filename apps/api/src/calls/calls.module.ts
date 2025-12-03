import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { CallSessionService } from './call-session.service';

@Module({
  providers: [CallsService, CallSessionService],
  controllers: [CallsController],
  exports: [CallsService, CallSessionService],
})
export class CallsModule {}
