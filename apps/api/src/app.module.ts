import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';

import configuration from './config/configuration';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { QueueModule } from './queue/queue.module';
import { ProfileModule } from './profile/profile.module';
import { HealthModule } from './health/health.module';
import { TwilioModule } from './twilio/twilio.module';
import { ElevenLabsModule } from './elevenlabs/elevenlabs.module';
import { OpenAIModule } from './openai/openai.module';
import { CallsModule } from './calls/calls.module';
import { ConversationModule } from './conversation/conversation.module';
import { BillingModule } from './billing/billing.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { JobsModule } from './jobs/jobs.module';
import { UserPhonesModule } from './user-phones/user-phones.module';
import { GroqLlmModule } from './groq-llm/groq-llm.module';
import { ChatModule } from './chat/chat.module';
import { MemoirModule } from './memoir/memoir.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '.env.local'),
        path.resolve(__dirname, '..', '..', '.env'),
        path.resolve(__dirname, '..', '..', '.env.local'),
      ],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
    ]),
    SupabaseModule,
    AuthModule,
    QueueModule,
    ProfileModule,
    HealthModule,
    TwilioModule,
    ElevenLabsModule,
    OpenAIModule,
    CallsModule,
    ConversationModule,
    BillingModule,
    WebhooksModule,
    JobsModule,
    UserPhonesModule,
    GroqLlmModule,
    ChatModule,
    MemoirModule,
  ],
})
export class AppModule {}
