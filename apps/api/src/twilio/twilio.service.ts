import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse';

@Injectable()
export class TwilioService implements OnModuleInit {
  private readonly logger = new Logger(TwilioService.name);
  private client: Twilio;
  private phoneNumber: string = '';
  private webhookBaseUrl: string = '';

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const accountSid = this.configService.get<string>('twilio.accountSid');
    const authToken = this.configService.get<string>('twilio.authToken');
    this.phoneNumber = this.configService.get<string>('twilio.phoneNumber');
    this.webhookBaseUrl = this.configService.get<string>(
      'twilio.webhookBaseUrl',
    );

    if (!accountSid || !authToken) {
      this.logger.warn(
        'Twilio credentials not configured. Twilio features will be disabled.',
      );
      return;
    }

    this.client = new Twilio(accountSid, authToken);
    this.logger.log('Twilio client initialized');
  }

  getClient(): Twilio | null {
    return this.client || null;
  }

  getPhoneNumber(): string {
    return this.phoneNumber;
  }

  getWebhookUrl(path: string): string {
    return `${this.webhookBaseUrl}${path}`;
  }

  async initiateCall(
    to: string,
    options?: {
      statusCallback?: string;
    },
  ): Promise<{ callSid: string; status: string } | null> {
    if (!this.client) {
      this.logger.error('Twilio client not initialized');
      return null;
    }

    try {
      const call = await this.client.calls.create({
        to,
        from: this.phoneNumber,
        url: this.getWebhookUrl('/api/webhooks/twilio/voice'),
        statusCallback:
          options?.statusCallback ||
          this.getWebhookUrl('/api/webhooks/twilio/status'),
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      this.logger.log(`Call initiated: ${call.sid} to ${to}`);
      return { callSid: call.sid, status: call.status };
    } catch (error) {
      this.logger.error(`Failed to initiate call to ${to}:`, error);
      throw error;
    }
  }

  createVoiceResponse(): VoiceResponse {
    return new VoiceResponse();
  }

  generateGreetingTwiML(
    audioUrl: string,
    gatherAction: string,
  ): VoiceResponse {
    const response = new VoiceResponse();

    // Play greeting audio
    response.play(audioUrl);

    // Gather speech input
    response.gather({
      input: ['speech'],
      action: gatherAction,
      method: 'POST',
      speechTimeout: 'auto',
      language: 'en-US',
    });

    // If no input, say goodbye
    response.say(
      { voice: 'alice' },
      "I didn't catch that. Please call back when you're ready to talk.",
    );

    return response;
  }

  generateConversationTwiML(
    audioUrl: string,
    gatherAction: string,
  ): VoiceResponse {
    const response = new VoiceResponse();

    // Play AI response audio
    response.play(audioUrl);

    // Continue gathering speech
    response.gather({
      input: ['speech'],
      action: gatherAction,
      method: 'POST',
      speechTimeout: 'auto',
      language: 'en-US',
    });

    // Timeout handling
    response.say({ voice: 'alice' }, 'Are you still there?');
    response.gather({
      input: ['speech'],
      action: gatherAction,
      method: 'POST',
      speechTimeout: 'auto',
      language: 'en-US',
    });

    response.say({ voice: 'alice' }, 'Goodbye!');
    response.hangup();

    return response;
  }

  generateOnboardingTwiML(
    prompt: string,
    gatherAction: string,
  ): VoiceResponse {
    const response = new VoiceResponse();

    response.say({ voice: 'alice' }, prompt);

    response.gather({
      input: ['speech'],
      action: gatherAction,
      method: 'POST',
      speechTimeout: 'auto',
      language: 'en-US',
    });

    return response;
  }

  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>,
  ): boolean {
    const authToken = this.configService.get<string>('twilio.authToken');
    if (!authToken) return false;

    const twilio = require('twilio');
    return twilio.validateRequest(authToken, signature, url, params);
  }
}
