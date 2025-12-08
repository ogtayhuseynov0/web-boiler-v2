import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { MemoriesModule } from '../memories/memories.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [MemoriesModule, QueueModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
