import { Module, Global, forwardRef } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';
import { ElevenLabsController } from './elevenlabs.controller';
import { ElevenLabsWebhookController } from './elevenlabs-webhook.controller';
import { CallsModule } from '../calls/calls.module';
import { QueueModule } from '../queue/queue.module';

@Global()
@Module({
  imports: [forwardRef(() => CallsModule), QueueModule],
  controllers: [ElevenLabsController, ElevenLabsWebhookController],
  providers: [ElevenLabsService],
  exports: [ElevenLabsService],
})
export class ElevenLabsModule {}
