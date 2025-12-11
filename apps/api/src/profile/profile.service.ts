import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface MemoirSharingSettings {
  is_memoir_public: boolean;
  memoir_share_slug: string | null;
  memoir_title: string | null;
  memoir_description: string | null;
}

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

  // ==================== MEMOIR SHARING ====================

  async getMemoirSharingSettings(userId: string): Promise<MemoirSharingSettings> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('is_memoir_public, memoir_share_slug, memoir_title, memoir_description')
      .eq('id', userId)
      .single();

    if (error) {
      this.logger.error('Failed to fetch sharing settings:', error);
      throw error;
    }

    return {
      is_memoir_public: data?.is_memoir_public || false,
      memoir_share_slug: data?.memoir_share_slug || null,
      memoir_title: data?.memoir_title || null,
      memoir_description: data?.memoir_description || null,
    };
  }

  async updateMemoirSharingSettings(
    userId: string,
    settings: {
      is_memoir_public?: boolean;
      memoir_title?: string;
      memoir_description?: string;
    },
  ): Promise<MemoirSharingSettings> {
    const supabase = this.supabaseService.getClient();

    // Get current profile for slug generation
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, preferred_name, memoir_share_slug')
      .eq('id', userId)
      .single();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (settings.is_memoir_public !== undefined) {
      updateData.is_memoir_public = settings.is_memoir_public;

      // Generate slug if making public and no slug exists
      if (settings.is_memoir_public && !profile?.memoir_share_slug) {
        const name = profile?.preferred_name || profile?.full_name || 'memoir';
        const { data: slugData } = await supabase.rpc('generate_memoir_slug', {
          user_name: name,
        });
        updateData.memoir_share_slug = slugData;
      }
    }

    if (settings.memoir_title !== undefined) {
      updateData.memoir_title = settings.memoir_title;
    }
    if (settings.memoir_description !== undefined) {
      updateData.memoir_description = settings.memoir_description;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('is_memoir_public, memoir_share_slug, memoir_title, memoir_description')
      .single();

    if (error) {
      this.logger.error('Failed to update sharing settings:', error);
      throw error;
    }

    return {
      is_memoir_public: data?.is_memoir_public || false,
      memoir_share_slug: data?.memoir_share_slug || null,
      memoir_title: data?.memoir_title || null,
      memoir_description: data?.memoir_description || null,
    };
  }

  async updateMemoirSlug(userId: string, newSlug: string): Promise<string> {
    const supabase = this.supabaseService.getClient();

    // Normalize slug
    const slug = newSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (slug.length < 3) {
      throw new Error('Slug must be at least 3 characters');
    }

    // Check if slug is taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('memoir_share_slug', slug)
      .neq('id', userId)
      .single();

    if (existing) {
      throw new Error('This URL is already taken');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ memoir_share_slug: slug, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('memoir_share_slug')
      .single();

    if (error) {
      this.logger.error('Failed to update slug:', error);
      throw error;
    }

    return data?.memoir_share_slug;
  }

  // ==================== PUBLIC MEMOIR ACCESS ====================

  async getPublicMemoirBySlug(slug: string) {
    const supabase = this.supabaseService.getClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, preferred_name, avatar_url, memoir_title, memoir_description, is_memoir_public, memoir_share_slug')
      .eq('memoir_share_slug', slug)
      .eq('is_memoir_public', true)
      .single();

    if (error || !profile) {
      return null;
    }

    return profile;
  }

  async getPublicMemoirs(limit = 20, offset = 0) {
    const supabase = this.supabaseService.getClient();

    const { data, error, count } = await supabase
      .from('profiles')
      .select('id, full_name, preferred_name, avatar_url, memoir_title, memoir_description, memoir_share_slug, updated_at', { count: 'exact' })
      .eq('is_memoir_public', true)
      .not('memoir_share_slug', 'is', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to fetch public memoirs:', error);
      return { memoirs: [], total: 0 };
    }

    return { memoirs: data || [], total: count || 0 };
  }

  async getAllPublicMemoirSlugs(): Promise<string[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('memoir_share_slug')
      .eq('is_memoir_public', true)
      .not('memoir_share_slug', 'is', null);

    if (error) {
      this.logger.error('Failed to fetch public memoir slugs:', error);
      return [];
    }

    return (data || []).map((p) => p.memoir_share_slug).filter(Boolean);
  }
}
