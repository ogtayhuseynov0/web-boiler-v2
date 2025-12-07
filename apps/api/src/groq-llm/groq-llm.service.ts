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
    console.log(this.defaultModel);
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

  async createChatCompletionStream(request: ChatCompletionRequest): Promise<{
    stream: Stream<ChatCompletionChunk>;
    requestStartTime: number;
  }> {
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

    const messagePreview =
      request.messages.length > 0
        ? request.messages[request.messages.length - 1].content
            ?.toString()
            .substring(0, 50)
        : '';

    this.logger.log(
      `[PERF] Starting stream request | model: ${model} | messages: ${request.messages.length} | last: "${messagePreview}..."`,
    );

    const requestStartTime = performance.now();

    const response = await this.client.chat.completions.create({
      ...openaiRequest,
      model,
      stream: true,
      user: user_id,
    });

    const apiCallDuration = performance.now() - requestStartTime;
    this.logger.log(
      `[PERF] Groq API call returned stream in ${apiCallDuration.toFixed(2)}ms`,
    );

    return { stream: response, requestStartTime };
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

    this.logger.log(`[PERF] Starting non-streaming request | model: ${model}`);

    const startTime = performance.now();

    const completion = await this.client.chat.completions.create({
      ...openaiRequest,
      model,
      stream: false,
      user: user_id,
    });

    const duration = performance.now() - startTime;
    this.logger.log(
      `[PERF] Non-streaming completion in ${duration.toFixed(2)}ms | tokens: ${completion.usage?.total_tokens || 'N/A'}`,
    );

    return completion;
  }
}
