import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsProcessor } from './jobs.processor';
import { MemoriesModule } from '../memories/memories.module';
import { CallsModule } from '../calls/calls.module';
import { MemoirModule } from '../memoir/memoir.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'jobs',
    }),
    MemoriesModule,
    CallsModule,
    forwardRef(() => MemoirModule),
  ],
  providers: [JobsProcessor],
  exports: [JobsProcessor],
})
export class JobsModule {}
