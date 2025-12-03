import {
  Controller,
  Post,
  Body,
  Headers,
  Res,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { TwilioService } from '../twilio/twilio.service';
import { CallsService } from '../calls/calls.service';
import { ConversationService } from '../conversation/conversation.service';
import { ConfigService } from '@nestjs/config';

interface TwilioVoiceWebhook {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  ApiVersion: string;
}

interface TwilioGatherWebhook extends TwilioVoiceWebhook {
  SpeechResult?: string;
  Confidence?: string;
}

interface TwilioStatusWebhook extends TwilioVoiceWebhook {
  CallDuration?: string;
  Timestamp?: string;
}

@ApiTags('webhooks')
@Controller('api/webhooks/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);

  constructor(
    private twilioService: TwilioService,
    private callsService: CallsService,
    private conversationService: ConversationService,
    private configService: ConfigService,
  ) {}

  @Post('voice')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle incoming Twilio voice webhook' })
  async handleVoice(
    @Body() body: TwilioVoiceWebhook,
    @Headers('x-twilio-signature') signature: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Incoming call from ${body.From}, CallSid: ${body.CallSid}`);

    try {
      // Handle the inbound call
      const { audioUrl, session } =
        await this.conversationService.handleInboundCall(
          body.CallSid,
          body.From,
        );

      // Generate TwiML response
      const twiml = this.twilioService.createVoiceResponse();

      if (session.state === 'ending') {
        // No balance - just play message and hang up
        if (audioUrl) {
          twiml.play(audioUrl);
        } else {
          twiml.say(
            { voice: 'alice' },
            "I'm sorry, you're out of credits. Please add more balance on our website.",
          );
        }
        twiml.hangup();
      } else {
        // Play greeting and gather speech
        if (audioUrl) {
          twiml.play(audioUrl);
        }

        const gatherUrl = this.twilioService.getWebhookUrl(
          '/api/webhooks/twilio/gather',
        );

        twiml.gather({
          input: ['speech'],
          action: gatherUrl,
          method: 'POST',
          speechTimeout: 'auto',
          language: 'en-US',
        });

        // Fallback if no speech detected
        twiml.say({ voice: 'alice' }, 'Are you still there?');
        twiml.gather({
          input: ['speech'],
          action: gatherUrl,
          method: 'POST',
          speechTimeout: '3',
          language: 'en-US',
        });

        twiml.say({ voice: 'alice' }, 'Goodbye!');
        twiml.hangup();
      }

      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      this.logger.error('Error handling voice webhook:', error);

      const twiml = this.twilioService.createVoiceResponse();
      twiml.say(
        { voice: 'alice' },
        "I'm sorry, there was an error. Please try again later.",
      );
      twiml.hangup();

      res.type('text/xml');
      res.send(twiml.toString());
    }
  }

  @Post('gather')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Twilio gather (speech input) webhook' })
  async handleGather(
    @Body() body: TwilioGatherWebhook,
    @Headers('x-twilio-signature') signature: string,
    @Res() res: Response,
  ) {
    const speechResult = body.SpeechResult || '';
    this.logger.log(
      `Speech received for ${body.CallSid}: "${speechResult}" (confidence: ${body.Confidence})`,
    );

    try {
      // Process the user's speech
      const { audioUrl, shouldEnd } =
        await this.conversationService.handleUserInput(
          body.CallSid,
          speechResult,
        );

      // Generate TwiML response
      const twiml = this.twilioService.createVoiceResponse();

      if (audioUrl) {
        twiml.play(audioUrl);
      }

      if (shouldEnd) {
        twiml.hangup();
      } else {
        // Continue the conversation
        const gatherUrl = this.twilioService.getWebhookUrl(
          '/api/webhooks/twilio/gather',
        );

        twiml.gather({
          input: ['speech'],
          action: gatherUrl,
          method: 'POST',
          speechTimeout: 'auto',
          language: 'en-US',
        });

        // Fallback
        twiml.say({ voice: 'alice' }, 'Are you still there?');
        twiml.gather({
          input: ['speech'],
          action: gatherUrl,
          method: 'POST',
          speechTimeout: '3',
          language: 'en-US',
        });

        twiml.say({ voice: 'alice' }, 'Goodbye!');
        twiml.hangup();
      }

      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      this.logger.error('Error handling gather webhook:', error);

      const twiml = this.twilioService.createVoiceResponse();
      twiml.say(
        { voice: 'alice' },
        "I'm sorry, there was an error. Please try again.",
      );
      twiml.hangup();

      res.type('text/xml');
      res.send(twiml.toString());
    }
  }

  @Post('status')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleStatus(
    @Body() body: TwilioStatusWebhook,
    @Headers('x-twilio-signature') signature: string,
  ) {
    this.logger.log(
      `Call status update for ${body.CallSid}: ${body.CallStatus}`,
    );

    try {
      // Update call status in database
      const updates: Record<string, unknown> = {};

      if (body.CallDuration) {
        updates.duration_seconds = parseInt(body.CallDuration, 10);
      }

      if (
        body.CallStatus === 'completed' ||
        body.CallStatus === 'failed' ||
        body.CallStatus === 'busy' ||
        body.CallStatus === 'no-answer' ||
        body.CallStatus === 'canceled'
      ) {
        updates.ended_at = new Date().toISOString();

        // Handle call end (cleanup, billing, etc.)
        await this.conversationService.handleCallEnd(body.CallSid);
      }

      await this.callsService.updateCallStatus(
        body.CallSid,
        body.CallStatus,
        updates as { duration_seconds?: number; ended_at?: string },
      );

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling status webhook:', error);
      return { success: false };
    }
  }
}
