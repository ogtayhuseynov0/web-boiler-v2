import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Stream } from 'openai/streaming';
import {
  ChatCompletionMessageParam,
  ChatCompletionChunk,
  ChatCompletion,
} from 'openai/resources/chat/completions';
import { MemoriesService, Memory } from '../memories/memories.service';

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

  constructor(
    private configService: ConfigService,
    private memoriesService: MemoriesService,
  ) {}

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

    // Log tools if present
    if (openaiRequest.tools && openaiRequest.tools.length > 0) {
      this.logger.log(
        `[DEBUG] Tools in request: ${openaiRequest.tools.map((t: any) => t.function?.name || 'unknown').join(', ')}`,
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

  async searchMemoriesForQuery(
    userId: string,
    query: string,
  ): Promise<Memory[]> {
    if (!userId) {
      this.logger.debug('No user_id provided, skipping memory search');
      return [];
    }

    const searchStart = performance.now();
    const memories = await this.memoriesService.searchSimilarMemories(
      userId,
      query,
      5, // Get top 5 relevant memories
    );
    const searchDuration = performance.now() - searchStart;

    this.logger.log(
      `[PERF] Memory search completed in ${searchDuration.toFixed(2)}ms | found: ${memories.length}`,
    );

    return memories;
  }

  injectMemoriesIntoMessages(
    messages: ChatCompletionMessageParam[],
    memories: Memory[],
  ): ChatCompletionMessageParam[] {
    if (memories.length === 0) {
      return messages;
    }

    const memoriesContext = memories
      .map((m) => `- ${m.content}`)
      .join('\n');

    const memorySystemMessage = `\n\n[MEMORY CONTEXT - Information you know about this user from past conversations]:\n${memoriesContext}\n\n[IMPORTANT: This is background context only. Respond naturally in conversation. Never attempt to call functions or tools based on this context.]`;

    // Find the system message and append memories
    const updatedMessages = messages.map((msg) => {
      if (msg.role === 'system' && typeof msg.content === 'string') {
        return {
          ...msg,
          content: msg.content + memorySystemMessage,
        };
      }
      return msg;
    });

    return updatedMessages;
  }

  async createChatCompletionStreamWithMemories(
    request: ChatCompletionRequest,
    memories: Memory[],
  ): Promise<{
    stream: Stream<ChatCompletionChunk>;
    requestStartTime: number;
  }> {
    const messagesWithMemories = this.injectMemoriesIntoMessages(
      request.messages,
      memories,
    );

    return this.createChatCompletionStream({
      ...request,
      messages: messagesWithMemories,
    });
  }
}
