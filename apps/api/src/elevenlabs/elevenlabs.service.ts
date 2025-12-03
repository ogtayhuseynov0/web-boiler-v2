import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

interface GenerateSpeechOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

@Injectable()
export class ElevenLabsService implements OnModuleInit {
  private readonly logger = new Logger(ElevenLabsService.name);
  private apiKey: string;
  private defaultVoiceId: string;
  private modelId: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {}

  onModuleInit() {
    this.apiKey = this.configService.get<string>('elevenlabs.apiKey');
    this.defaultVoiceId = this.configService.get<string>(
      'elevenlabs.defaultVoiceId',
    );
    this.modelId = this.configService.get<string>('elevenlabs.modelId');

    if (!this.apiKey) {
      this.logger.warn(
        'ElevenLabs API key not configured. TTS features will be disabled.',
      );
      return;
    }

    this.logger.log('ElevenLabs service initialized');
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generateSpeech(
    text: string,
    options?: GenerateSpeechOptions,
  ): Promise<Buffer | null> {
    if (!this.apiKey) {
      this.logger.error('ElevenLabs API key not configured');
      return null;
    }

    const voiceId = options?.voiceId || this.defaultVoiceId;
    const modelId = options?.modelId || this.modelId;

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability: options?.stability ?? 0.5,
              similarity_boost: options?.similarityBoost ?? 0.75,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`ElevenLabs API error: ${error}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error('Failed to generate speech:', error);
      return null;
    }
  }

  async generateAndUploadSpeech(
    text: string,
    callId: string,
    messageIndex: number,
    options?: GenerateSpeechOptions,
  ): Promise<string | null> {
    const audioBuffer = await this.generateSpeech(text, options);
    if (!audioBuffer) {
      return null;
    }

    try {
      const fileName = `calls/${callId}/message_${messageIndex}.mp3`;
      const supabase = this.supabaseService.getClient();

      const { error } = await supabase.storage
        .from('audio')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (error) {
        this.logger.error('Failed to upload audio to Supabase:', error);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('audio').getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      this.logger.error('Failed to upload audio:', error);
      return null;
    }
  }

  async getVoices(): Promise<
    Array<{ voice_id: string; name: string }> | null
  > {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.voices;
    } catch (error) {
      this.logger.error('Failed to fetch voices:', error);
      return null;
    }
  }
}
