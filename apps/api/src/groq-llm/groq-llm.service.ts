import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Stream } from 'openai/streaming';
import {
  ChatCompletionMessageParam,
  ChatCompletionChunk,
  ChatCompletion,
} from 'openai/resources/chat/completions';

export interface ChatCompletionRequest {
  messages: ChatCompletionMessageParam[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  user_id?: string;
  elevenlabs_extra_body?: Record<string, any>;
}

@Injectable()
export class GroqLlmService implements OnModuleInit {
  private readonly logger = new Logger(GroqLlmService.name);
  private client: OpenAI;
  private defaultModel: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    this.defaultModel =
      this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';

    if (!apiKey) {
      this.logger.warn(
        'GROQ_API_KEY not configured. Custom LLM endpoint will not work.',
      );
      return;
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    this.logger.log(
      `Groq LLM service initialized with model: ${this.defaultModel}`,
    );
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async createChatCompletionStream(
    request: ChatCompletionRequest,
  ): Promise<Stream<ChatCompletionChunk>> {
    if (!this.client) {
      throw new Error('Groq client not configured');
    }

    const { elevenlabs_extra_body, user_id, stream, ...openaiRequest } =
      request;

    // Log extra body if present (for debugging/context)
    if (elevenlabs_extra_body) {
      this.logger.debug(
        `ElevenLabs extra body: ${JSON.stringify(elevenlabs_extra_body)}`,
      );
    }

    // Use default model if not specified
    const model = openaiRequest.model || this.defaultModel;

    this.logger.log(
      `Creating chat completion with model: ${model}, messages: ${request.messages.length}`,
    );

    const response = await this.client.chat.completions.create({
      ...openaiRequest,
      model,
      stream: true,
      user: user_id,
    });

    return response;
  }

  async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletion> {
    if (!this.client) {
      throw new Error('Groq client not configured');
    }

    const { elevenlabs_extra_body, user_id, stream, ...openaiRequest } =
      request;
    const model = openaiRequest.model || this.defaultModel;

    this.logger.log(
      `Creating non-streaming chat completion with model: ${model}`,
    );

    const completion = await this.client.chat.completions.create({
      ...openaiRequest,
      model,
      stream: false,
      user: user_id,
    });

    return completion;
  }
}
