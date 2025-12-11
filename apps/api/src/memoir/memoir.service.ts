import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIService } from '../openai/openai.service';
import { QueueService } from '../queue/queue.service';
import * as crypto from 'crypto';

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
  content_hash: string | null;
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
  sourceType?: 'chat' | 'call' | 'manual' | 'guest';
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

    // Check for duplicates before creating
    const duplicateCheck = await this.checkForDuplicate(
      data.userId,
      data.title,
      data.content,
    );

    if (duplicateCheck.isDuplicate) {
      this.logger.log(`Skipping duplicate story: ${duplicateCheck.reason}`);
      return null;
    }

    let chapterId = data.chapterId;

    // Auto-assign chapter if not provided
    if (!chapterId) {
      const assignment = await this.assignChapter(data.userId, data.content, data.timePeriod);
      chapterId = assignment.chapterId;
    }

    // Generate content hash for future duplicate detection
    const contentHash = this.generateContentHash(data.content);

    const { data: story, error } = await supabase
      .from('chapter_stories')
      .insert({
        chapter_id: chapterId,
        user_id: data.userId,
        title: data.title || null,
        content: data.content,
        content_hash: contentHash,
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

  // ==================== DUPLICATE DETECTION ====================

  generateContentHash(content: string): string {
    // Hash first 500 chars of normalized content for quick comparison
    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 500);
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  async checkForDuplicate(
    userId: string,
    title: string | null | undefined,
    content: string,
  ): Promise<{ isDuplicate: boolean; reason?: string }> {
    const supabase = this.supabaseService.getClient();

    // 1. Check exact content hash
    const contentHash = this.generateContentHash(content);
    const { data: hashMatch } = await supabase
      .from('chapter_stories')
      .select('id, title')
      .eq('user_id', userId)
      .eq('content_hash', contentHash)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (hashMatch) {
      return { isDuplicate: true, reason: `Similar content exists in story "${hashMatch.title}"` };
    }

    // 2. Check title similarity if title provided
    if (title && title.length > 5) {
      // Extract key words from title (first 3 significant words)
      const titleWords = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 3);

      if (titleWords.length >= 2) {
        // Search for stories with similar titles
        const { data: similarTitles } = await supabase
          .from('chapter_stories')
          .select('id, title')
          .eq('user_id', userId)
          .eq('is_active', true)
          .or(titleWords.map((word) => `title.ilike.%${word}%`).join(','));

        // Check if any result has 2+ matching words
        for (const story of similarTitles || []) {
          if (!story.title) continue;
          const existingWords = story.title.toLowerCase().split(/\s+/);
          const matchCount = titleWords.filter((w) =>
            existingWords.some((ew) => ew.includes(w) || w.includes(ew))
          ).length;

          if (matchCount >= 2) {
            return { isDuplicate: true, reason: `Similar title exists: "${story.title}"` };
          }
        }
      }
    }

    return { isDuplicate: false };
  }

  // ==================== STORY EXTRACTION ====================

  async extractStoriesFromConversation(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    sourceType: 'chat' | 'call' = 'chat',
    sourceId?: string,
    focusTopics?: string[],
  ): Promise<ChapterStory[]> {
    this.logger.log(`Extracting stories from ${messages.length} messages`);

    if (!this.openaiService.isConfigured()) {
      this.logger.warn('OpenAI not configured, skipping story extraction');
      return [];
    }

    // Check for existing stories from this source to avoid duplicates
    if (sourceId) {
      const existingStories = await this.getStoriesBySource(userId, sourceId);
      if (existingStories.length > 0) {
        this.logger.log(`Found ${existingStories.length} existing stories for source ${sourceId}, skipping extraction`);
        return [];
      }
    }

    // Include both user AND assistant messages for full context
    const conversationText = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    if (conversationText.length < 100) {
      this.logger.log('Conversation too short for story extraction');
      return [];
    }

    const chapters = await this.getOrCreateChapters(userId);
    const chapterList = chapters
      .map((c) => `- "${c.title}" (${c.slug}): ${c.description || 'General stories'}`)
      .join('\n');

    // Build focus topics section if provided
    const focusSection =
      focusTopics && focusTopics.length > 0
        ? `\n=== USER'S FOCUS AREAS (prioritize stories about these topics) ===\n${focusTopics.map((t) => `- ${t}`).join('\n')}\n`
        : '';

    const prompt = `You are extracting personal life stories for a memoir book. Your job is to find meaningful, specific stories worth preserving.${focusSection}

=== EXAMPLES OF GOOD EXTRACTIONS ===

Example 1 - User said: "I remember my grandmother's kitchen, the smell of fresh bread every Sunday morning. She taught me to bake when I was 8. We'd spend hours together, and she'd tell me stories about growing up in Poland."

Good extraction:
{
  "title": "Baking Bread with Grandmother on Sundays",
  "content": "Sunday mornings at my grandmother's house were sacred. The aroma of fresh-baked bread would fill her small kitchen, wrapping around me like a warm blanket the moment I walked through the door. I was eight years old when she first invited me to help her knead the dough. Her hands, weathered by decades of work, moved with a certainty mine could only aspire to.\\n\\nAs we worked side by side, flour dusting our aprons and the countertop, she would share stories of her childhood in Poland. Tales of her own grandmother, of cold winters and warm hearths, of recipes passed down through generations. Those Sunday mornings weren't just about bread—they were about connection, about tradition, about the quiet inheritance of love through food.",
  "summary": "Learning to bake bread with grandmother on Sunday mornings while hearing stories of her Polish childhood.",
  "time_period": "childhood",
  "chapter_slug": "early-years"
}

Example 2 - User said: "My first job was terrible. I worked at a call center for 6 months in 2015. The manager was awful but I met my best friend Sarah there."

Good extraction:
{
  "title": "Finding Friendship in a Difficult First Job",
  "content": "My first real job was at a call center in 2015, and by most measures, it was miserable. The fluorescent lights buzzed overhead, the scripts we read felt robotic, and our manager seemed to take personal offense at bathroom breaks. I spent six months there, each day feeling like I was slowly being ground down.\\n\\nBut amid that chaos, I found Sarah. She sat two cubicles over, and I first noticed her because she'd drawn tiny flowers on her headset. We started eating lunch together, bonding over shared complaints that eventually turned into real conversations. That job taught me something unexpected: sometimes the worst circumstances bring the best people into your life. Sarah and I are still close today.",
  "summary": "A difficult first job at a call center led to an unexpected lifelong friendship with Sarah.",
  "time_period": "2015",
  "chapter_slug": "young-adult"
}

=== EXAMPLES OF BAD EXTRACTIONS (AVOID THESE) ===

- Too short/generic: "I learned to bake from my grandmother." (lacks narrative depth, no specific details)
- Too generic: "I had good times with family." (no specific details or emotions)
- Made up details: Adding events, names, or places not mentioned in the conversation
- Repetitive: Extracting multiple stories about the same event with different wording
- Not a story: "User likes coffee" - this is a preference, not a life story

=== CONVERSATION TO ANALYZE ===

${conversationText}

=== AVAILABLE CHAPTERS ===

${chapterList}

=== EXTRACTION RULES ===

1. Extract stories that mention specific people, events, or experiences
2. Each story should be at least 50 words - expand brief mentions into fuller narratives while staying true to what was shared
3. Preserve EXACT names, dates, and places mentioned - never invent major details but you can add connecting narrative
4. Write in first person, past tense
5. If the same story is told multiple times in the conversation, extract it only ONCE
6. Even brief mentions of meaningful experiences (like "my father saved his friend") should be captured
7. Match each story to the most appropriate chapter based on life stage and theme

Return ONLY valid JSON:
{
  "stories": [
    {
      "title": "Brief descriptive title (5-8 words)",
      "content": "Full narrative, minimum 50 words, 1-3 paragraphs",
      "summary": "One sentence summary",
      "time_period": "Time reference if mentioned (e.g., '1990s', 'childhood', 'age 25')",
      "chapter_slug": "matching-chapter-slug"
    }
  ]
}`;

    try {
      const response = await this.openaiService.chat(
        [{ role: 'user', content: prompt }],
        { maxTokens: 3000, temperature: 0.4 },
      );

      this.logger.debug(`OpenAI extraction response: ${response?.substring(0, 500)}`);

      if (!response) {
        this.logger.warn('OpenAI returned empty response for story extraction');
        return [];
      }

      // Clean response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }

      const parsed = JSON.parse(cleanedResponse.trim());
      const savedStories: ChapterStory[] = [];

      this.logger.log(`OpenAI found ${parsed.stories?.length || 0} potential stories`);

      for (const extracted of parsed.stories || []) {
        // Skip stories that are too short (less than 50 words)
        const wordCount = extracted.content?.split(/\s+/).length || 0;
        if (wordCount < 50) {
          this.logger.log(`Skipping story "${extracted.title}" - only ${wordCount} words (min 50)`);
          continue;
        }

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

    // Enhanced patterns with weights (longer/more specific keywords = higher weight)
    const patterns: Record<string, Array<{ keyword: string; weight: number }>> = {
      'early-years': [
        { keyword: 'born', weight: 3 },
        { keyword: 'childhood', weight: 4 },
        { keyword: 'baby', weight: 3 },
        { keyword: 'toddler', weight: 4 },
        { keyword: 'kindergarten', weight: 5 },
        { keyword: 'young child', weight: 5 },
        { keyword: 'elementary school', weight: 5 },
        { keyword: 'first grade', weight: 5 },
        { keyword: 'preschool', weight: 5 },
        { keyword: 'five years old', weight: 5 },
        { keyword: 'six years old', weight: 5 },
      ],
      'growing-up': [
        { keyword: 'middle school', weight: 5 },
        { keyword: 'high school', weight: 5 },
        { keyword: 'teenager', weight: 4 },
        { keyword: 'teen', weight: 3 },
        { keyword: 'adolescent', weight: 4 },
        { keyword: 'graduation', weight: 4 },
        { keyword: 'puberty', weight: 4 },
        { keyword: 'prom', weight: 4 },
        { keyword: 'sixteen', weight: 3 },
        { keyword: 'seventeen', weight: 3 },
        { keyword: 'senior year', weight: 5 },
        { keyword: 'junior year', weight: 5 },
      ],
      'young-adult': [
        { keyword: 'college', weight: 4 },
        { keyword: 'university', weight: 4 },
        { keyword: 'first job', weight: 5 },
        { keyword: 'moved out', weight: 5 },
        { keyword: '20s', weight: 3 },
        { keyword: 'twenties', weight: 4 },
        { keyword: 'dorm', weight: 4 },
        { keyword: 'freshman', weight: 4 },
        { keyword: 'sophomore', weight: 4 },
        { keyword: 'internship', weight: 4 },
        { keyword: 'first apartment', weight: 5 },
        { keyword: 'degree', weight: 3 },
      ],
      'building-a-life': [
        { keyword: 'married', weight: 4 },
        { keyword: 'wedding', weight: 4 },
        { keyword: 'career', weight: 3 },
        { keyword: 'house', weight: 3 },
        { keyword: 'promoted', weight: 4 },
        { keyword: 'business', weight: 3 },
        { keyword: 'mortgage', weight: 4 },
        { keyword: 'bought a home', weight: 5 },
        { keyword: 'started a company', weight: 5 },
        { keyword: 'first house', weight: 5 },
        { keyword: 'engagement', weight: 4 },
        { keyword: 'thirties', weight: 3 },
        { keyword: 'forties', weight: 3 },
      ],
      family: [
        { keyword: 'mother', weight: 3 },
        { keyword: 'father', weight: 3 },
        { keyword: 'mom', weight: 3 },
        { keyword: 'dad', weight: 3 },
        { keyword: 'brother', weight: 3 },
        { keyword: 'sister', weight: 3 },
        { keyword: 'grandpa', weight: 4 },
        { keyword: 'grandma', weight: 4 },
        { keyword: 'grandmother', weight: 4 },
        { keyword: 'grandfather', weight: 4 },
        { keyword: 'family', weight: 2 },
        { keyword: 'children', weight: 3 },
        { keyword: 'kids', weight: 2 },
        { keyword: 'spouse', weight: 3 },
        { keyword: 'wife', weight: 3 },
        { keyword: 'husband', weight: 3 },
        { keyword: 'aunt', weight: 3 },
        { keyword: 'uncle', weight: 3 },
        { keyword: 'cousin', weight: 3 },
        { keyword: 'newborn', weight: 4 },
        { keyword: 'gave birth', weight: 5 },
        { keyword: 'became a parent', weight: 5 },
      ],
      reflections: [
        { keyword: 'learned', weight: 2 },
        { keyword: 'realized', weight: 3 },
        { keyword: 'wisdom', weight: 4 },
        { keyword: 'advice', weight: 3 },
        { keyword: 'regret', weight: 4 },
        { keyword: 'proud', weight: 3 },
        { keyword: 'grateful', weight: 3 },
        { keyword: 'lesson', weight: 3 },
        { keyword: 'looking back', weight: 5 },
        { keyword: 'in hindsight', weight: 5 },
        { keyword: 'what i know now', weight: 5 },
        { keyword: 'if i could', weight: 4 },
        { keyword: 'life taught me', weight: 5 },
      ],
    };

    // Calculate weighted scores for each chapter
    const chapterScores = new Map<string, number>();

    for (const [slug, keywords] of Object.entries(patterns)) {
      let score = 0;
      for (const { keyword, weight } of keywords) {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const matches = lowerContent.match(regex);
        if (matches) {
          score += matches.length * weight;
        }
      }
      if (score > 0) {
        chapterScores.set(slug, score);
      }
    }

    // Also consider time period hints for additional scoring
    if (timePeriod) {
      const tp = timePeriod.toLowerCase();
      if (tp.includes('childhood') || tp.includes('kid') || /\b[0-5]\s*(years?\s*old)?\b/.test(tp)) {
        chapterScores.set('early-years', (chapterScores.get('early-years') || 0) + 10);
      } else if (tp.includes('teen') || tp.includes('high school') || /\b1[0-8]\s*(years?\s*old)?\b/.test(tp)) {
        chapterScores.set('growing-up', (chapterScores.get('growing-up') || 0) + 10);
      } else if (tp.includes('college') || tp.includes('20s') || /\b2[0-5]\s*(years?\s*old)?\b/.test(tp)) {
        chapterScores.set('young-adult', (chapterScores.get('young-adult') || 0) + 10);
      } else if (tp.includes('30s') || tp.includes('40s') || tp.includes('career')) {
        chapterScores.set('building-a-life', (chapterScores.get('building-a-life') || 0) + 10);
      }
    }

    // Get highest scoring chapter
    const sortedScores = [...chapterScores.entries()].sort((a, b) => b[1] - a[1]);

    if (sortedScores.length > 0) {
      const [bestSlug, bestScore] = sortedScores[0];
      this.logger.debug(`Chapter assignment: ${bestSlug} (score: ${bestScore})`);
      const chapter = chapters.find((c) => c.slug === bestSlug);
      if (chapter) {
        return { chapterId: chapter.id, timePeriod: timePeriod || null };
      }
    }

    return { chapterId: chapters[0]?.id, timePeriod: timePeriod || null };
  }
}
