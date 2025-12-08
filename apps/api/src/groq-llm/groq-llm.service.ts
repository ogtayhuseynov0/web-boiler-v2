import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Stream } from 'openai/streaming';
import {
  ChatCompletionMessageParam,
  ChatCompletionChunk,
  ChatCompletion,
} from 'openai/resources/chat/completions';
import { MemoirService, ChapterStory } from '../memoir/memoir.service';

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
    private memoirService: MemoirService,
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

  async getStoriesForContext(userId: string): Promise<ChapterStory[]> {
    if (!userId) {
      this.logger.debug('No user_id provided, skipping story fetch');
      return [];
    }

    const searchStart = performance.now();
    const chapters = await this.memoirService.getChaptersWithStories(userId);
    const stories = chapters.flatMap(c => c.stories).slice(0, 5);
    const searchDuration = performance.now() - searchStart;

    this.logger.log(
      `[PERF] Stories fetch completed in ${searchDuration.toFixed(2)}ms | found: ${stories.length}`,
    );

    return stories;
  }

  injectStoriesIntoMessages(
    messages: ChatCompletionMessageParam[],
    stories: ChapterStory[],
  ): ChatCompletionMessageParam[] {
    if (stories.length === 0) {
      return messages;
    }

    const storiesContext = stories
      .map((s) => `- ${s.summary || s.content.substring(0, 200)}`)
      .join('\n');

    const storySystemMessage = `\n\n[MEMORY CONTEXT - Information you know about this user from past conversations]:\n${storiesContext}\n\n[IMPORTANT: This is background context only. Respond naturally in conversation. Never attempt to call functions or tools based on this context.]`;

    // Find the system message and append stories
    const updatedMessages = messages.map((msg) => {
      if (msg.role === 'system' && typeof msg.content === 'string') {
        return {
          ...msg,
          content: msg.content + storySystemMessage,
        };
      }
      return msg;
    });

    return updatedMessages;
  }

  async createChatCompletionStreamWithStories(
    request: ChatCompletionRequest,
    stories: ChapterStory[],
  ): Promise<{
    stream: Stream<ChatCompletionChunk>;
    requestStartTime: number;
  }> {
    const messagesWithStories = this.injectStoriesIntoMessages(
      request.messages,
      stories,
    );

    return this.createChatCompletionStream({
      ...request,
      messages: messagesWithStories,
    });
  }
}
