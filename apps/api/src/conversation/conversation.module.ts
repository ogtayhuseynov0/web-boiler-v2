import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CallsModule } from '../calls/calls.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [CallsModule, QueueModule],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
