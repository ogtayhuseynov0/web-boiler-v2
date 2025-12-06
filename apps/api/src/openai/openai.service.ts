import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
} from 'openai/resources/chat/completions';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface Memory {
  content: string;
  category: string;
  importance: number;
}

@Injectable()
export class OpenAIService implements OnModuleInit {
  private readonly logger = new Logger(OpenAIService.name);
  private client: OpenAI;
  private model: string;
  private embeddingModel: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('openai.apiKey');
    this.model =
      this.configService.get<string>('openai.model') || 'gpt-4o-mini';
    this.embeddingModel =
      this.configService.get<string>('openai.embeddingModel') ||
      'text-embedding-3-small';

    if (!apiKey) {
      this.logger.warn(
        'OpenAI API key not configured. AI features will be disabled.',
      );
      return;
    }

    this.client = new OpenAI({ apiKey });
    this.logger.log(`OpenAI service initialized with model: ${this.model}`);
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async chat(
    messages: ConversationMessage[],
    options?: ChatOptions,
  ): Promise<string | null> {
    if (!this.client) {
      this.logger.error('OpenAI client not configured');
      return null;
    }

    try {
      const openaiMessages: ChatCompletionMessageParam[] = [];

      if (options?.systemPrompt) {
        openaiMessages.push({
          role: 'system',
          content: options.systemPrompt,
        } as ChatCompletionSystemMessageParam);
      }

      openaiMessages.push(
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      );

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        max_tokens: options?.maxTokens ?? 500,
        temperature: options?.temperature ?? 0.7,
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      this.logger.error('Chat completion failed:', error);
      return null;
    }
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.client) {
      this.logger.error('OpenAI client not configured');
      return null;
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      return response.data[0]?.embedding || null;
    } catch (error) {
      this.logger.error('Embedding generation failed:', error);
      return null;
    }
  }

  async extractMemories(
    conversationMessages: ConversationMessage[],
  ): Promise<Memory[]> {
    if (!this.client) {
      return [];
    }

    const conversationText = conversationMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const systemPrompt = `You are a memory extraction assistant. Analyze the conversation and extract important facts, preferences, tasks, or reminders about the user.

Return a JSON array of memories. Each memory should have:
- content: The fact or preference (string)
- category: One of "preference", "fact", "task", "reminder", "relationship", "other"
- importance: A score from 0.0 to 1.0 indicating how important this is to remember

Only extract genuinely important information. Be concise.

Example output:
[
  {"content": "User prefers morning calls", "category": "preference", "importance": 0.8},
  {"content": "User's mother's name is Sarah", "category": "relationship", "importance": 0.7}
]

If no important memories are found, return an empty array: []`;

    try {
      this.logger.log(`Extracting memories from conversation (${conversationMessages.length} messages)`);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Extract memories from this conversation:\n\n${conversationText}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      this.logger.log(`OpenAI response: ${content?.substring(0, 200)}...`);

      if (!content) return [];

      const parsed = JSON.parse(content);
      const memories = Array.isArray(parsed)
        ? parsed
        : parsed.memories || parsed.data || [];

      this.logger.log(`Parsed ${memories.length} memories from response`);
      return memories;
    } catch (error) {
      this.logger.error('Memory extraction failed:', error);
      return [];
    }
  }

  buildSystemPrompt(
    userName: string,
    memories: Array<{ content: string; category: string }>,
    additionalContext?: string,
  ): string {
    const memoriesText =
      memories.length > 0
        ? memories.map((m) => `- [${m.category}] ${m.content}`).join('\n')
        : 'No memories yet.';

    return `You are a helpful AI personal assistant speaking with ${userName} over the phone.

## Known Facts About ${userName}:
${memoriesText}

## Guidelines:
- Be concise - this is a phone conversation, not a text chat
- Speak naturally and conversationally
- Remember what the user has told you and reference it naturally
- If asked about something you don't know, say so honestly
- Keep responses under 3-4 sentences unless explaining something complex
- Don't use bullet points, lists, or markdown - speak naturally
- Be warm and personable but professional

${additionalContext ? `## Current Context:\n${additionalContext}` : ''}`;
  }

  buildOnboardingPrompt(): string {
    return `You are an AI assistant helping a new user set up their account over the phone.

## Your Task:
1. Welcome them warmly
2. Ask for their name (what they'd like to be called)
3. Confirm you understood their name correctly
4. Thank them and explain briefly what you can help with

## Guidelines:
- Be friendly and patient
- Speak naturally - this is a phone call
- Keep it brief - just get their name for now
- If you can't understand, politely ask them to repeat`;
  }
}
