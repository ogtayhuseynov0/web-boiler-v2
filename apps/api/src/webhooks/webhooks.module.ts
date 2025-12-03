import { Module } from '@nestjs/common';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { CallsModule } from '../calls/calls.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [CallsModule, ConversationModule],
  controllers: [TwilioWebhookController],
})
export class WebhooksModule {}
