import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { QueueModule } from '../queue/queue.module';
import { MemoirModule } from '../memoir/memoir.module';

@Module({
  imports: [QueueModule, MemoirModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
