import { Module } from '@nestjs/common';
import { MemoirController } from './memoir.controller';
import { MemoirService } from './memoir.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [MemoirController],
  providers: [MemoirService],
  exports: [MemoirService],
})
export class MemoirModule {}
