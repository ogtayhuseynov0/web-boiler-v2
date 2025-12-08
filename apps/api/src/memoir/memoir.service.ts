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
  story_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChapterStory {
  id: string;
  chapter_id: string;
  user_id: string;
  title: string | null;
  content: string;
  summary: string | null;
  time_period: string | null;
  source_type: 'chat' | 'call' | 'manual';
  source_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChapterWithStories extends MemoirChapter {
  stories: ChapterStory[];
}

export interface CreateStoryDto {
  userId: string;
  chapterId?: string;
  title?: string;
  content: string;
  summary?: string;
  timePeriod?: string;
  sourceType?: 'chat' | 'call' | 'manual';
  sourceId?: string;
}

@Injectable()
export class MemoirService {
  private readonly logger = new Logger(MemoirService.name);

  constructor(
    private supabaseService: SupabaseService,
    private openaiService: OpenAIService,
    private queueService: QueueService,
  ) {}

  // ==================== CHAPTERS ====================

  async getOrCreateChapters(userId: string): Promise<MemoirChapter[]> {
    const supabase = this.supabaseService.getClient();

    this.logger.log(`Getting or creating chapters for user ${userId}`);

    const { error } = await supabase.rpc('get_or_create_default_chapters', {
      p_user_id: userId,
    });

    if (error) {
      this.logger.error('Failed to get/create chapters via RPC:', error.message);
      throw new Error(`Failed to get/create chapters: ${error.message}`);
    }

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

  async getChaptersWithStories(userId: string): Promise<ChapterWithStories[]> {
    const chapters = await this.getOrCreateChapters(userId);
    const supabase = this.supabaseService.getClient();

    const { data: stories, error } = await supabase
      .from('chapter_stories')
      .select('*')
      .in('chapter_id', chapters.map((c) => c.id))
      .eq('is_active', true)
      .order('display_order')
      .order('created_at');

    if (error) {
      this.logger.error('Failed to fetch stories:', error);
    }

    const storiesMap = new Map<string, ChapterStory[]>();
    (stories || []).forEach((s) => {
      const existing = storiesMap.get(s.chapter_id) || [];
      existing.push(s);
      storiesMap.set(s.chapter_id, existing);
    });

    return chapters.map((chapter) => ({
      ...chapter,
      stories: storiesMap.get(chapter.id) || [],
    }));
  }

  async getChapterById(userId: string, chapterId: string): Promise<ChapterWithStories | null> {
    const supabase = this.supabaseService.getClient();

    const { data: chapter, error: chapterError } = await supabase
      .from('memoir_chapters')
      .select('*')
      .eq('id', chapterId)
      .eq('user_id', userId)
      .single();

    if (chapterError || !chapter) {
      return null;
    }

    const { data: stories } = await supabase
      .from('chapter_stories')
      .select('*')
      .eq('chapter_id', chapterId)
      .eq('is_active', true)
      .order('display_order')
      .order('created_at');

    return {
      ...chapter,
      stories: stories || [],
    };
  }

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

    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

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

  async updateChapter(
    userId: string,
    chapterId: string,
    data: {
      title?: string;
      description?: string;
      timePeriodStart?: string;
      timePeriodEnd?: string;
    },
  ): Promise<MemoirChapter | null> {
    const supabase = this.supabaseService.getClient();

    const updateData: Record<string, unknown> = {};
    if (data.title) {
      updateData.title = data.title;
      updateData.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.timePeriodStart !== undefined) updateData.time_period_start = data.timePeriodStart;
    if (data.timePeriodEnd !== undefined) updateData.time_period_end = data.timePeriodEnd;

    const { data: chapter, error } = await supabase
      .from('memoir_chapters')
      .update(updateData)
      .eq('id', chapterId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update chapter:', error);
      return null;
    }

    return chapter;
  }

  async deleteChapter(userId: string, chapterId: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('memoir_chapters')
      .delete()
      .eq('id', chapterId)
      .eq('user_id', userId)
      .eq('is_default', false);

    if (error) {
      this.logger.error('Failed to delete chapter:', error);
      return false;
    }

    return true;
  }

  async reorderChapters(
    userId: string,
    chapters: Array<{ id: string; order: number }>,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    try {
      for (const chapter of chapters) {
        const { error } = await supabase
          .from('memoir_chapters')
          .update({ display_order: chapter.order })
          .eq('id', chapter.id)
          .eq('user_id', userId);

        if (error) {
          this.logger.error('Failed to reorder chapter:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to reorder chapters:', error);
      return false;
    }
  }

  // ==================== STORIES ====================

  async createStory(data: CreateStoryDto): Promise<ChapterStory | null> {
    const supabase = this.supabaseService.getClient();

    let chapterId = data.chapterId;

    // Auto-assign chapter if not provided
    if (!chapterId) {
      const assignment = await this.assignChapter(data.userId, data.content, data.timePeriod);
      chapterId = assignment.chapterId;
    }

    const { data: story, error } = await supabase
      .from('chapter_stories')
      .insert({
        chapter_id: chapterId,
        user_id: data.userId,
        title: data.title || null,
        content: data.content,
        summary: data.summary || null,
        time_period: data.timePeriod || null,
        source_type: data.sourceType || 'manual',
        source_id: data.sourceId || null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create story:', error);
      return null;
    }

    this.logger.log(`Story created: ${story.id} in chapter ${chapterId}`);
    return story;
  }

  async getStoryById(userId: string, storyId: string): Promise<ChapterStory | null> {
    const supabase = this.supabaseService.getClient();

    const { data: story, error } = await supabase
      .from('chapter_stories')
      .select('*')
      .eq('id', storyId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return story;
  }

  async getStoriesBySource(userId: string, sourceId: string): Promise<ChapterStory[]> {
    const supabase = this.supabaseService.getClient();

    const { data: stories, error } = await supabase
      .from('chapter_stories')
      .select('*')
      .eq('user_id', userId)
      .eq('source_id', sourceId)
      .eq('is_active', true)
      .order('created_at');

    if (error) {
      this.logger.error('Failed to fetch stories by source:', error);
      return [];
    }

    return stories || [];
  }

  async updateStory(
    userId: string,
    storyId: string,
    data: {
      title?: string;
      content?: string;
      summary?: string;
      timePeriod?: string;
      chapterId?: string;
    },
  ): Promise<ChapterStory | null> {
    const supabase = this.supabaseService.getClient();

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.timePeriod !== undefined) updateData.time_period = data.timePeriod;
    if (data.chapterId !== undefined) updateData.chapter_id = data.chapterId;

    const { data: story, error } = await supabase
      .from('chapter_stories')
      .update(updateData)
      .eq('id', storyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update story:', error);
      return null;
    }

    return story;
  }

  async deleteStory(userId: string, storyId: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('chapter_stories')
      .update({ is_active: false })
      .eq('id', storyId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to delete story:', error);
      return false;
    }

    return true;
  }

  // ==================== STORY EXTRACTION ====================

  async extractStoriesFromConversation(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    sourceType: 'chat' | 'call' = 'chat',
    sourceId?: string,
  ): Promise<ChapterStory[]> {
    this.logger.log(`Extracting stories from ${messages.length} messages`);

    if (!this.openaiService.isConfigured()) {
      this.logger.warn('OpenAI not configured, skipping story extraction');
      return [];
    }

    const conversationText = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n\n');

    if (conversationText.length < 50) {
      this.logger.log('Conversation too short for story extraction');
      return [];
    }

    const chapters = await this.getOrCreateChapters(userId);
    const chapterList = chapters
      .map((c) => `- "${c.title}" (${c.slug}): ${c.description || 'General stories'}`)
      .join('\n');

    const prompt = `You are analyzing a conversation to extract personal life stories for a memoir.

CONVERSATION:
${conversationText}

AVAILABLE CHAPTERS:
${chapterList}

Extract any personal stories, memories, or significant life events shared. For each story found, return JSON:

{
  "stories": [
    {
      "title": "Brief title for the story (5-8 words)",
      "content": "The full story written as a first-person narrative, expanding on what was shared while staying true to the facts. 2-4 paragraphs.",
      "summary": "One sentence summary",
      "time_period": "Time reference if mentioned (e.g., '1990s', 'childhood', 'college')",
      "chapter_slug": "best-matching-chapter-slug"
    }
  ]
}

Rules:
- Only extract actual stories/memories, not casual conversation
- Write content as polished first-person narrative
- Stay true to facts shared, don't invent details
- Each story should be a complete, standalone narrative
- Return empty stories array if no meaningful stories found
- Match stories to the most appropriate chapter based on theme/time period`;

    try {
      const response = await this.openaiService.chat(
        [{ role: 'user', content: prompt }],
        { maxTokens: 2000, temperature: 0.7 },
      );

      if (!response) {
        return [];
      }

      const parsed = JSON.parse(response);
      const savedStories: ChapterStory[] = [];

      for (const extracted of parsed.stories || []) {
        const chapter = chapters.find((c) => c.slug === extracted.chapter_slug) || chapters[0];

        const story = await this.createStory({
          userId,
          chapterId: chapter.id,
          title: extracted.title,
          content: extracted.content,
          summary: extracted.summary,
          timePeriod: extracted.time_period,
          sourceType,
          sourceId,
        });

        if (story) {
          savedStories.push(story);
        }
      }

      this.logger.log(`Extracted ${savedStories.length} stories from conversation`);
      return savedStories;
    } catch (error) {
      this.logger.error('Failed to extract stories:', error);
      return [];
    }
  }

  // ==================== CHAPTER ASSIGNMENT ====================

  async assignChapter(
    userId: string,
    storyContent: string,
    timePeriod?: string | null,
  ): Promise<{ chapterId: string; timePeriod: string | null }> {
    const chapters = await this.getOrCreateChapters(userId);

    if (!this.openaiService.isConfigured()) {
      return {
        chapterId: chapters[0]?.id,
        timePeriod: timePeriod || null,
      };
    }

    const chapterList = chapters
      .map((c) => `- "${c.title}" (${c.slug}): ${c.description || 'General stories'}`)
      .join('\n');

    const prompt = `Given this story from someone's life, determine which chapter it belongs to.

STORY: "${storyContent.substring(0, 500)}..."

AVAILABLE CHAPTERS:
${chapterList}

Return JSON:
{
  "chapter_slug": "the-slug-of-best-matching-chapter",
  "time_period": "extracted time reference or null"
}`;

    try {
      const response = await this.openaiService.chat(
        [{ role: 'user', content: prompt }],
        { maxTokens: 100, temperature: 0.3 },
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

    return this.assignChapterByKeywords(chapters, storyContent, timePeriod);
  }

  private assignChapterByKeywords(
    chapters: MemoirChapter[],
    content: string,
    timePeriod?: string | null,
  ): { chapterId: string; timePeriod: string | null } {
    const lowerContent = content.toLowerCase();

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

    return { chapterId: chapters[0]?.id, timePeriod: timePeriod || null };
  }
}
