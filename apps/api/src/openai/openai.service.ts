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
  time_period?: string | null;
  time_context?: string | null;
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
    existingMemories: string[] = [],
  ): Promise<Memory[]> {
    if (!this.client) {
      return [];
    }

    const conversationText = conversationMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const existingMemoriesText =
      existingMemories.length > 0
        ? `\n\nALREADY KNOWN (do not extract these again):\n${existingMemories.map((m) => `- ${m}`).join('\n')}`
        : '';

    const systemPrompt = `You are a memoir assistant helping capture life stories. Extract meaningful details, stories, and facts about the person from their conversation.

RULES:
1. Capture life stories, experiences, relationships, and personal details
2. Write as natural statements (use "Grew up in...", "Met spouse...", "Worked at...", "Loves...", etc.)
3. NEVER start with "User" - just state the story/fact directly
4. Be specific - include names, places, dates, emotions when shared
5. Extract time period references when mentioned (years, decades, life stages)
6. Prioritize:
   - Family stories and relationships
   - Childhood and growing up memories
   - Career and life milestones
   - Meaningful experiences and lessons learned
   - Personal preferences and values
7. DO NOT extract:
   - Generic small talk
   - Anything already in the "ALREADY KNOWN" list

Return JSON: {"memories": [...]}

Each memory object:
- content: The story or fact (natural statement, NOT starting with "User")
- category: "preference" | "fact" | "task" | "reminder" | "relationship" | "other"
- importance: 0.0-1.0 (how meaningful to their life story)
- time_period: Normalized time reference like "1960s", "childhood", "college", "early-career", "2015", or null if unclear
- time_context: The exact time phrase from the memory (e.g., "when I was 8", "back in '72", "during college") or null

GOOD examples:
- {"content": "Grew up on a farm in Kansas with three siblings", "category": "fact", "importance": 0.8, "time_period": "childhood", "time_context": "grew up"}
- {"content": "Met spouse Sarah at college in 1985", "category": "relationship", "importance": 0.9, "time_period": "1985", "time_context": "at college in 1985"}
- {"content": "Worked as a nurse for 30 years at Memorial Hospital", "category": "fact", "importance": 0.8, "time_period": "career", "time_context": "for 30 years"}
- {"content": "Mom's name is Helen, passed away in 2010", "category": "relationship", "importance": 0.9, "time_period": "2010", "time_context": "passed away in 2010"}
- {"content": "Favorite childhood memory is fishing trips with grandfather", "category": "relationship", "importance": 0.7, "time_period": "childhood", "time_context": "childhood memory"}

BAD examples (don't extract):
- "User said they grew up..." (don't use "User")
- "Had a conversation about family" (too vague)
- "Mentioned something about work" (not specific)

If nothing meaningful, return: {"memories": []}`;

    try {
      this.logger.log(
        `Extracting memories from conversation (${conversationMessages.length} messages)`,
      );

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Extract new memories from this conversation:${existingMemoriesText}\n\nCONVERSATION:\n${conversationText}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.2,
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
        ? memories.map((m) => `- ${m.content}`).join('\n')
        : 'No stories captured yet.';

    return `You are Memoir, a warm and empathetic AI companion helping ${userName} capture their life stories and memories.

## What you know about ${userName}:
${memoriesText}

## Your Role:
- Help ${userName} share and preserve their life stories, memories, and experiences
- Ask thoughtful follow-up questions to draw out more details and emotions
- Be genuinely curious about their life - childhood, family, career, relationships, travels, achievements
- Celebrate their stories and validate their experiences
- Gently prompt them with questions if they're unsure what to share

## Guidelines:
- Speak naturally and warmly - this is an intimate conversation
- Keep responses conversational (2-4 sentences)
- Reference things they've shared before to show you remember
- Ask open-ended questions: "What was that like?", "How did that make you feel?", "Tell me more about..."
- Don't use bullet points or markdown - speak naturally

${additionalContext ? `## Current Context:\n${additionalContext}` : ''}`;
  }

  buildOnboardingPrompt(): string {
    return `You are Memoir, a warm AI companion that helps people capture their life stories.

## Your Task:
1. Welcome them warmly to Memoir
2. Ask for their name (what they'd like to be called)
3. Briefly explain you're here to help them preserve their memories and stories
4. Ask what kind of stories they'd like to start with (childhood, family, career, etc.)

## Guidelines:
- Be warm, genuine, and inviting
- Speak naturally - this is a phone call
- Make them feel comfortable sharing
- Show excitement about hearing their stories`;
  }
}
