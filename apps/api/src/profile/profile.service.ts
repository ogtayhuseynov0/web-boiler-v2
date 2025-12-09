import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private supabaseService: SupabaseService) {}

  async getProfile(userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Profile not found');
    }

    return data;
  }

  async updateProfile(
    userId: string,
    updates: { email?: string; full_name?: string; avatar_url?: string },
  ) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getStoryFocusTopics(userId: string): Promise<string[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('story_focus_topics')
      .eq('id', userId)
      .single();

    if (error) {
      this.logger.error('Failed to fetch focus topics:', error);
      return [];
    }

    return data?.story_focus_topics || [];
  }

  async updateStoryFocusTopics(
    userId: string,
    topics: string[],
  ): Promise<string[]> {
    const supabase = this.supabaseService.getClient();

    // Normalize and dedupe topics
    const normalizedTopics = [...new Set(
      topics.map((t) => t.trim()).filter((t) => t.length > 0),
    )].slice(0, 10); // Limit to 10 topics

    const { data, error } = await supabase
      .from('profiles')
      .update({
        story_focus_topics: normalizedTopics,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('story_focus_topics')
      .single();

    if (error) {
      this.logger.error('Failed to update focus topics:', error);
      throw error;
    }

    return data?.story_focus_topics || [];
  }
}
