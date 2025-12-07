import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIService } from '../openai/openai.service';

export interface Memory {
  id: string;
  user_id: string;
  call_id: string | null;
  content: string;
  category: 'preference' | 'fact' | 'task' | 'reminder' | 'relationship' | 'other';
  importance_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMemoryDto {
  user_id: string;
  call_id?: string;
  content: string;
  category: Memory['category'];
  importance_score?: number;
}

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);

  constructor(
    private supabaseService: SupabaseService,
    private openaiService: OpenAIService,
  ) {}

  async createMemory(data: CreateMemoryDto): Promise<Memory | null> {
    const supabase = this.supabaseService.getClient();

    this.logger.log(`Creating memory for user ${data.user_id}: "${data.content.substring(0, 50)}..."`);

    // Generate embedding for the memory content
    const embedding = await this.openaiService.generateEmbedding(data.content);

    const { data: memory, error } = await supabase
      .from('user_memories')
      .insert({
        user_id: data.user_id,
        call_id: data.call_id || null,
        content: data.content,
        category: data.category,
        importance_score: data.importance_score || 0.5,
        embedding: embedding,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create memory:', error);
      return null;
    }

    this.logger.log(`Memory created with id: ${memory.id}`);
    return memory;
  }

  async getMemoriesByUserId(
    userId: string,
    options?: {
      category?: Memory['category'];
      search?: string;
      callId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ memories: Memory[]; total: number }> {
    const supabase = this.supabaseService.getClient();
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let query = supabase
      .from('user_memories')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (options?.search) {
      query = query.ilike('content', `%${options.search}%`);
    }

    if (options?.callId) {
      query = query.eq('call_id', options.callId);
    }

    const { data: memories, error, count } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) {
      this.logger.error('Failed to fetch memories:', error);
      return { memories: [], total: 0 };
    }

    return { memories: memories || [], total: count || 0 };
  }

  async searchSimilarMemories(
    userId: string,
    query: string,
    limit: number = 10,
  ): Promise<Memory[]> {
    const embedding = await this.openaiService.generateEmbedding(query);
    if (!embedding) {
      return [];
    }

    const supabase = this.supabaseService.getClient();

    const { data: memories, error } = await supabase.rpc('match_memories', {
      query_embedding: embedding,
      match_user_id: userId,
      match_threshold: 0.5,
      match_count: limit,
    });

    if (error) {
      this.logger.error('Failed to search memories:', error);
      return [];
    }

    return memories || [];
  }

  async getMemoryById(id: string, userId: string): Promise<Memory | null> {
    const supabase = this.supabaseService.getClient();

    const { data: memory, error } = await supabase
      .from('user_memories')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return memory;
  }

  async deleteMemory(id: string, userId: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('user_memories')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to delete memory:', error);
      return false;
    }

    return true;
  }

  async extractAndSaveMemories(
    userId: string,
    callId: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<Memory[]> {
    this.logger.log(`Starting memory extraction for call ${callId} with ${messages.length} messages`);

    if (!this.openaiService.isConfigured()) {
      this.logger.warn('OpenAI not configured, skipping memory extraction');
      return [];
    }

    // Fetch existing memories to avoid duplicates
    const existingMemoriesResult = await this.getMemoriesByUserId(userId, { limit: 100 });
    const existingMemoryContents = existingMemoriesResult.memories.map(m => m.content);

    this.logger.log(`Found ${existingMemoryContents.length} existing memories to check against`);

    // Use OpenAI to extract memories from conversation, passing existing ones
    const extractedMemories = await this.openaiService.extractMemories(
      messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      existingMemoryContents,
    );

    this.logger.log(`OpenAI returned ${extractedMemories.length} new memories`);

    const savedMemories: Memory[] = [];

    for (const extracted of extractedMemories) {
      const memory = await this.createMemory({
        user_id: userId,
        call_id: callId,
        content: extracted.content,
        category: extracted.category as Memory['category'],
        importance_score: extracted.importance,
      });

      if (memory) {
        savedMemories.push(memory);
      }
    }

    this.logger.log(
      `Extracted ${savedMemories.length} memories from call ${callId}`,
    );
    return savedMemories;
  }
}
