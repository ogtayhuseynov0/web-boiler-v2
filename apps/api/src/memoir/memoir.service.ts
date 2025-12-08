import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIService } from '../openai/openai.service';
import { QueueService } from '../queue/queue.service';

export interface MemoirChapter {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  display_order: number;
  time_period_start: string | null;
  time_period_end: string | null;
  is_default: boolean;
  memory_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChapterContent {
  id: string;
  chapter_id: string;
  content: string;
  version: number;
  word_count: number;
  memory_ids: string[];
  is_current: boolean;
  generated_at: string;
}

export interface ChapterWithContent extends MemoirChapter {
  current_content?: ChapterContent | null;
}

interface MemoryForChapter {
  id: string;
  content: string;
  category: string;
  time_period: string | null;
  time_context: string | null;
  created_at: string;
}

@Injectable()
export class MemoirService {
  private readonly logger = new Logger(MemoirService.name);

  constructor(
    private supabaseService: SupabaseService,
    private openaiService: OpenAIService,
    private queueService: QueueService,
  ) {}

  /**
   * Get or create default chapters for a user
   */
  async getOrCreateChapters(userId: string): Promise<MemoirChapter[]> {
    const supabase = this.supabaseService.getClient();

    this.logger.log(`Getting or creating chapters for user ${userId}`);

    // Use the database function to get or create default chapters
    const { data, error } = await supabase.rpc('get_or_create_default_chapters', {
      p_user_id: userId,
    });

    if (error) {
      this.logger.error('Failed to get/create chapters via RPC:', error.message, error.details, error.hint);
      throw new Error(`Failed to get/create chapters: ${error.message}`);
    }

    // Fetch full chapter data
    const { data: chapters, error: fetchError } = await supabase
      .from('memoir_chapters')
      .select('*')
      .eq('user_id', userId)
      .order('display_order');

    if (fetchError) {
      this.logger.error('Failed to fetch chapters:', fetchError);
      throw fetchError;
    }

    return chapters || [];
  }

  /**
   * Get all chapters with their current content
   */
  async getChaptersWithContent(userId: string): Promise<ChapterWithContent[]> {
    const chapters = await this.getOrCreateChapters(userId);
    const supabase = this.supabaseService.getClient();

    // Fetch current content for all chapters
    const { data: contents, error } = await supabase
      .from('chapter_content')
      .select('*')
      .in(
        'chapter_id',
        chapters.map((c) => c.id),
      )
      .eq('is_current', true);

    if (error) {
      this.logger.error('Failed to fetch chapter contents:', error);
    }

    // Map content to chapters
    const contentMap = new Map<string, ChapterContent>();
    (contents || []).forEach((c) => {
      contentMap.set(c.chapter_id, c);
    });

    return chapters.map((chapter) => ({
      ...chapter,
      current_content: contentMap.get(chapter.id) || null,
    }));
  }

  /**
   * Determine which chapter a memory belongs to based on its content
   */
  async assignChapter(
    userId: string,
    memoryContent: string,
    timePeriod?: string | null,
  ): Promise<{ chapterId: string; timePeriod: string | null }> {
    const chapters = await this.getOrCreateChapters(userId);

    if (!this.openaiService.isConfigured()) {
      // Default to first chapter if AI not available
      return {
        chapterId: chapters[0]?.id,
        timePeriod: timePeriod || null,
      };
    }

    const chapterList = chapters
      .map((c) => `- "${c.title}" (${c.slug}): ${c.description || 'General stories'}`)
      .join('\n');

    const prompt = `Given this memory/story from someone's life, determine which chapter it belongs to and extract any time period references.

MEMORY: "${memoryContent}"

AVAILABLE CHAPTERS:
${chapterList}

Analyze the memory and return JSON:
{
  "chapter_slug": "the-slug-of-best-matching-chapter",
  "time_period": "extracted time reference or null (e.g., '1960s', 'childhood', 'college years', '2010')",
  "reasoning": "brief explanation"
}

Rules:
- Match based on content themes, not just explicit time references
- Family/relationship stories go to "family" chapter
- Life lessons/wisdom go to "reflections" chapter
- If unclear, choose based on the life stage mentioned
- Extract any time references from the memory text`;

    try {
      const response = await this.openaiService.chat(
        [{ role: 'user', content: prompt }],
        { maxTokens: 200, temperature: 0.3 },
      );

      if (response) {
        const parsed = JSON.parse(response);
        const matchedChapter = chapters.find((c) => c.slug === parsed.chapter_slug);

        return {
          chapterId: matchedChapter?.id || chapters[0]?.id,
          timePeriod: parsed.time_period || timePeriod || null,
        };
      }
    } catch (error) {
      this.logger.error('Failed to assign chapter via AI:', error);
    }

    // Fallback: use keyword matching
    return this.assignChapterByKeywords(chapters, memoryContent, timePeriod);
  }

  /**
   * Fallback chapter assignment using keywords
   */
  private assignChapterByKeywords(
    chapters: MemoirChapter[],
    content: string,
    timePeriod?: string | null,
  ): { chapterId: string; timePeriod: string | null } {
    const lowerContent = content.toLowerCase();

    // Keyword patterns for each chapter type
    const patterns: Record<string, string[]> = {
      'early-years': ['born', 'childhood', 'baby', 'toddler', 'kindergarten', 'young child'],
      'growing-up': ['school', 'high school', 'teenager', 'teen', 'adolescent', 'graduation'],
      'young-adult': ['college', 'university', 'first job', 'moved out', '20s', 'twenties'],
      'building-a-life': ['married', 'career', 'house', 'promoted', 'business'],
      family: ['mother', 'father', 'mom', 'dad', 'brother', 'sister', 'grandpa', 'grandma', 'family', 'children', 'kids', 'spouse', 'wife', 'husband'],
      reflections: ['learned', 'realized', 'wisdom', 'advice', 'regret', 'proud', 'grateful', 'lesson'],
    };

    for (const [slug, keywords] of Object.entries(patterns)) {
      if (keywords.some((kw) => lowerContent.includes(kw))) {
        const chapter = chapters.find((c) => c.slug === slug);
        if (chapter) {
          return { chapterId: chapter.id, timePeriod: timePeriod || null };
        }
      }
    }

    // Default to first chapter
    return { chapterId: chapters[0]?.id, timePeriod: timePeriod || null };
  }

  /**
   * Generate narrative prose for a chapter from its memories
   */
  async generateChapterNarrative(
    userId: string,
    chapterId: string,
  ): Promise<ChapterContent | null> {
    const supabase = this.supabaseService.getClient();

    // Get chapter info
    const { data: chapter, error: chapterError } = await supabase
      .from('memoir_chapters')
      .select('*')
      .eq('id', chapterId)
      .eq('user_id', userId)
      .single();

    if (chapterError || !chapter) {
      this.logger.error('Chapter not found:', chapterError);
      return null;
    }

    // Get all memories for this chapter
    const { data: memories, error: memoriesError } = await supabase
      .from('user_memories')
      .select('id, content, category, time_period, time_context, created_at')
      .eq('chapter_id', chapterId)
      .eq('is_active', true)
      .order('created_at');

    if (memoriesError) {
      this.logger.error('Failed to fetch memories:', memoriesError);
      return null;
    }

    if (!memories || memories.length === 0) {
      this.logger.log(`No memories for chapter ${chapter.title}`);
      return null;
    }

    // Get user name for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_name, full_name')
      .eq('id', userId)
      .single();

    const userName = profile?.preferred_name || profile?.full_name || 'the storyteller';

    // Generate narrative
    const narrative = await this.generateNarrativeFromMemories(
      chapter,
      memories as MemoryForChapter[],
      userName,
    );

    if (!narrative) {
      return null;
    }

    // Get current version number
    const { data: currentContent } = await supabase
      .from('chapter_content')
      .select('version')
      .eq('chapter_id', chapterId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (currentContent?.version || 0) + 1;

    // Save new content
    const { data: newContent, error: insertError } = await supabase
      .from('chapter_content')
      .insert({
        chapter_id: chapterId,
        content: narrative,
        version: nextVersion,
        word_count: narrative.split(/\s+/).length,
        memory_ids: memories.map((m) => m.id),
        is_current: true,
      })
      .select()
      .single();

    if (insertError) {
      this.logger.error('Failed to save chapter content:', insertError);
      return null;
    }

    this.logger.log(`Generated narrative for chapter "${chapter.title}" (v${nextVersion})`);
    return newContent;
  }

  /**
   * Use AI to generate narrative prose from memories
   */
  private async generateNarrativeFromMemories(
    chapter: MemoirChapter,
    memories: MemoryForChapter[],
    userName: string,
  ): Promise<string | null> {
    if (!this.openaiService.isConfigured()) {
      // Fallback: just concatenate memories
      return memories.map((m) => m.content).join('\n\n');
    }

    const memoriesText = memories
      .map((m, i) => `${i + 1}. ${m.content}${m.time_period ? ` (${m.time_period})` : ''}`)
      .join('\n');

    const prompt = `You are a skilled memoir writer helping ${userName} create a beautiful, personal narrative for their life story.

CHAPTER: "${chapter.title}"
${chapter.description ? `THEME: ${chapter.description}` : ''}

COLLECTED MEMORIES & STORIES:
${memoriesText}

Write a flowing, personal narrative that weaves these memories together into a cohesive chapter.

GUIDELINES:
- Write in first person as if ${userName} is telling their own story
- Create smooth transitions between different memories
- Add emotional depth while staying true to the facts shared
- Group related memories thematically when it flows naturally
- Use vivid, evocative language that brings memories to life
- Keep the authentic voice - this is their personal memoir
- If time periods are mentioned, use them to create chronological flow
- Don't add fictional events, only expand on what was shared
- Aim for 2-4 paragraphs depending on the amount of content
- Each paragraph should feel like a natural part of the life story

Write the narrative now:`;

    try {
      const response = await this.openaiService.chat(
        [{ role: 'user', content: prompt }],
        { maxTokens: 1500, temperature: 0.7 },
      );

      return response;
    } catch (error) {
      this.logger.error('Failed to generate narrative:', error);
      return null;
    }
  }

  /**
   * Queue chapter regeneration (called after new memories are added)
   */
  async queueChapterRegeneration(userId: string, chapterId: string): Promise<void> {
    this.logger.log(`Queueing regeneration for chapter ${chapterId}`);

    try {
      // Add to queue with short delay - use unique jobId to allow multiple regenerations
      await this.queueService.addJob('regenerate-chapter', {
        userId,
        chapterId,
        timestamp: Date.now(),
      }, {
        delay: 3000, // 3 second delay
      });
      this.logger.log(`Successfully queued regeneration for chapter ${chapterId}`);
    } catch (error) {
      this.logger.error(`Failed to queue regeneration for chapter ${chapterId}:`, error);
    }
  }

  /**
   * Process chapter regeneration job
   */
  async processChapterRegeneration(userId: string, chapterId: string): Promise<void> {
    this.logger.log(`Processing chapter regeneration for ${chapterId}`);
    await this.generateChapterNarrative(userId, chapterId);
  }

  /**
   * Create a custom chapter
   */
  async createChapter(
    userId: string,
    data: {
      title: string;
      description?: string;
      timePeriodStart?: string;
      timePeriodEnd?: string;
    },
  ): Promise<MemoirChapter | null> {
    const supabase = this.supabaseService.getClient();

    // Generate slug
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Get next display order
    const { data: lastChapter } = await supabase
      .from('memoir_chapters')
      .select('display_order')
      .eq('user_id', userId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const displayOrder = (lastChapter?.display_order || 0) + 1;

    const { data: chapter, error } = await supabase
      .from('memoir_chapters')
      .insert({
        user_id: userId,
        title: data.title,
        slug,
        description: data.description || null,
        display_order: displayOrder,
        time_period_start: data.timePeriodStart || null,
        time_period_end: data.timePeriodEnd || null,
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create chapter:', error);
      return null;
    }

    return chapter;
  }

  /**
   * Update chapter order
   */
  async reorderChapters(
    userId: string,
    chapterOrders: Array<{ id: string; order: number }>,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    for (const { id, order } of chapterOrders) {
      const { error } = await supabase
        .from('memoir_chapters')
        .update({ display_order: order })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        this.logger.error('Failed to reorder chapter:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * Delete a chapter
   */
  async deleteChapter(userId: string, chapterId: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('memoir_chapters')
      .delete()
      .eq('id', chapterId)
      .eq('user_id', userId)
      .eq('is_default', false); // Can't delete default chapters

    if (error) {
      this.logger.error('Failed to delete chapter:', error);
      return false;
    }

    return true;
  }
}
