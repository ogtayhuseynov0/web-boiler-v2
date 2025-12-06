import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { CallsService } from '../calls/calls.service';
import { QueueService } from '../queue/queue.service';
import { SupabaseService } from '../supabase/supabase.service';

interface ElevenLabsWebhookPayload {
  type: string;
  event_id?: string;
  timestamp?: string;
  conversation_id?: string;
  data?: {
    conversation_id?: string;
    agent_id?: string;
    status?: string;
    duration_seconds?: number;
    transcript?: Array<{
      role: 'user' | 'agent';
      message: string;
      timestamp?: number;
    }>;
    metadata?: Record<string, string>;
  };
  // post_call_transcription fields
  transcript?: Array<{
    role: 'user' | 'agent';
    message: string;
    time_in_call_secs?: number;
  }>;
  metadata?: Record<string, string>;
  call_duration_secs?: number;
}

interface RequestWithRawBody extends Request {
  rawBody?: string;
}

@ApiTags('webhooks')
@Controller('elevenlabs')
export class ElevenLabsWebhookController {
  private readonly logger = new Logger(ElevenLabsWebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private configService: ConfigService,
    private callsService: CallsService,
    private queueService: QueueService,
    private supabaseService: SupabaseService,
  ) {
    this.webhookSecret =
      this.configService.get<string>('ELEVENLABS_WEBHOOK_SECRET') || '';
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: RequestWithRawBody,
    @Headers('elevenlabs-signature') signature: string,
    @Body() payload: ElevenLabsWebhookPayload,
  ) {
    this.logger.log(`Webhook received, signature present: ${!!signature}`);

    // TODO: Enable signature verification in production
    // For now, skip verification - uncomment below when ready
    /*
    if (this.webhookSecret) {
      if (!this.verifySignature(req.rawBody, signature)) {
        this.logger.warn(`Invalid webhook signature. Received: ${signature}`);
        throw new UnauthorizedException('Invalid signature');
      }
    }
    */

    const convId = payload.conversation_id || payload.data?.conversation_id;
    this.logger.log(
      `Received ElevenLabs webhook: ${payload.type} for conversation ${convId}`,
    );

    try {
      switch (payload.type) {
        case 'conversation.initiated':
          await this.handleConversationInitiated(payload);
          break;

        case 'conversation.ended':
          await this.handleConversationEnded(payload);
          break;

        case 'conversation.transcript':
        case 'post_call_transcription':
          await this.handleTranscript(payload);
          break;

        default:
          this.logger.log(`Unhandled webhook type: ${payload.type}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  private verifySignature(
    rawBody: string | undefined,
    signature: string,
  ): boolean {
    if (!rawBody || !signature) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

      // Handle signature with or without prefix (e.g., "sha256=...")
      const cleanSignature = signature.replace(/^sha256=/, '');

      return crypto.timingSafeEqual(
        Buffer.from(cleanSignature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Signature verification error:', error);
      return false;
    }
  }

  private async handleConversationInitiated(
    payload: ElevenLabsWebhookPayload,
  ): Promise<void> {
    const conversation_id = payload.conversation_id || payload.data?.conversation_id;
    const metadata = payload.metadata || payload.data?.metadata;

    this.logger.log(`Conversation initiated: ${conversation_id}`);

    // If we have a call_id in metadata, update the call with conversation_id
    if (metadata?.call_id) {
      const supabase = this.supabaseService.getClient();
      await supabase
        .from('calls')
        .update({
          elevenlabs_conversation_id: conversation_id,
          status: 'in-progress',
        })
        .eq('id', metadata.call_id);
    }
  }

  private async handleConversationEnded(
    payload: ElevenLabsWebhookPayload,
  ): Promise<void> {
    const conversation_id = payload.conversation_id || payload.data?.conversation_id;
    const duration_seconds = payload.call_duration_secs || payload.data?.duration_seconds;
    const metadata = payload.metadata || payload.data?.metadata;
    const transcript = payload.transcript || payload.data?.transcript;

    this.logger.log(
      `Conversation ended: ${conversation_id}, duration: ${duration_seconds}s`,
    );

    const supabase = this.supabaseService.getClient();

    // Find the call by conversation_id or metadata
    let callId = metadata?.call_id;

    if (!callId) {
      const { data: call } = await supabase
        .from('calls')
        .select('id, user_id')
        .eq('elevenlabs_conversation_id', conversation_id)
        .single();

      if (call) {
        callId = call.id;
      }
    }

    if (!callId) {
      this.logger.warn(`No call found for conversation ${conversation_id}`);
      return;
    }

    // Get call details
    const { data: call } = await supabase
      .from('calls')
      .select('id, user_id')
      .eq('id', callId)
      .single();

    if (!call) {
      return;
    }

    // Store transcript if provided
    if (transcript && transcript.length > 0) {
      for (const entry of transcript) {
        await this.callsService.addMessage(
          callId,
          entry.role === 'agent' ? 'assistant' : 'user',
          entry.message,
        );
      }
    }

    // Calculate cost (e.g., $0.10 per minute)
    const costCents = Math.ceil((duration_seconds || 0) / 60) * 10;

    // Update call record
    await supabase
      .from('calls')
      .update({
        status: 'completed',
        duration_seconds: duration_seconds || 0,
        cost_cents: costCents,
        ended_at: new Date().toISOString(),
      })
      .eq('id', callId);

    // Deduct balance
    if (call.user_id && costCents > 0) {
      await supabase.rpc('deduct_balance', {
        p_user_id: call.user_id,
        p_amount: costCents,
        p_call_id: callId,
      });
    }

    // Queue memory extraction
    if (call.user_id) {
      await this.queueService.addJob('extract-memories', {
        callId: callId,
        userId: call.user_id,
      });
      this.logger.log(`Queued memory extraction for call ${callId}`);
    }
  }

  private async handleTranscript(
    payload: ElevenLabsWebhookPayload,
  ): Promise<void> {
    // Handle both nested (data.transcript) and top-level (transcript) structures
    const conversationId = payload.conversation_id || payload.data?.conversation_id;
    const transcript = payload.transcript || payload.data?.transcript;
    const metadata = payload.metadata || payload.data?.metadata;
    const durationSeconds = payload.call_duration_secs || payload.data?.duration_seconds;

    this.logger.log(`Processing transcript for conversation: ${conversationId}, entries: ${transcript?.length || 0}`);

    if (!transcript || transcript.length === 0) {
      this.logger.warn('No transcript entries in payload');
      return;
    }

    const supabase = this.supabaseService.getClient();

    // Find the call
    let callId = metadata?.call_id;
    let userId: string | null = null;

    if (!callId && conversationId) {
      const { data: call } = await supabase
        .from('calls')
        .select('id, user_id')
        .eq('elevenlabs_conversation_id', conversationId)
        .single();

      if (call) {
        callId = call.id;
        userId = call.user_id;
      }
    }

    if (!callId) {
      this.logger.warn(
        `No call found for transcript, conversation: ${conversationId}`,
      );
      return;
    }

    // Store transcript entries (skip entries with empty content)
    let storedCount = 0;
    for (const entry of transcript) {
      if (entry.message && entry.message.trim()) {
        await this.callsService.addMessage(
          callId,
          entry.role === 'agent' ? 'assistant' : 'user',
          entry.message,
        );
        storedCount++;
      }
    }

    this.logger.log(
      `Stored ${storedCount}/${transcript.length} transcript entries for call ${callId}`,
    );

    // If this is post_call_transcription, also update call and queue memory extraction
    if (payload.type === 'post_call_transcription') {
      // Update call with duration
      if (durationSeconds) {
        const costCents = Math.ceil(durationSeconds / 60) * 10;
        await supabase
          .from('calls')
          .update({
            status: 'completed',
            duration_seconds: durationSeconds,
            cost_cents: costCents,
            ended_at: new Date().toISOString(),
          })
          .eq('id', callId);

        // Deduct balance
        if (userId && costCents > 0) {
          await supabase.rpc('deduct_balance', {
            p_user_id: userId,
            p_amount: costCents,
            p_call_id: callId,
          });
        }
      }

      // Queue memory extraction
      if (userId) {
        await this.queueService.addJob('extract-memories', {
          callId: callId,
          userId: userId,
        });
        this.logger.log(`Queued memory extraction for call ${callId}`);
      }
    }
  }
}
