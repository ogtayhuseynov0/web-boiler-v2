import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsProcessor } from './jobs.processor';
import { CallsModule } from '../calls/calls.module';
import { MemoirModule } from '../memoir/memoir.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'jobs',
    }),
    CallsModule,
    forwardRef(() => MemoirModule),
    ProfileModule,
  ],
  providers: [JobsProcessor],
  exports: [JobsProcessor],
})
export class JobsModule {}
