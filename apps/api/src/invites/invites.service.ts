import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import { MemoirService } from '../memoir/memoir.service';
import * as crypto from 'crypto';

export interface StoryInvite {
  id: string;
  user_id: string;
  invite_code: string;
  guest_email: string;
  guest_name: string | null;
  topic: string | null;
  message: string | null;
  status: 'pending' | 'viewed' | 'completed' | 'expired';
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestStory {
  id: string;
  invite_id: string;
  user_id: string;
  guest_email: string;
  guest_name: string;
  title: string | null;
  content: string;
  relationship: string | null;
  chapter_id: string | null;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InviteWithOwner extends StoryInvite {
  owner_name: string;
}

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
    private memoirService: MemoirService,
  ) {}

  // Generate a random invite code
  private generateInviteCode(): string {
    return crypto.randomBytes(6).toString('hex'); // 12 char code
  }

  // ==================== USER INVITES ====================

  async createInvite(
    userId: string,
    data: {
      guestEmail: string;
      guestName?: string;
      topic?: string;
      message?: string;
      expiresInDays?: number;
    },
  ): Promise<StoryInvite | null> {
    const supabase = this.supabaseService.getClient();

    const inviteCode = this.generateInviteCode();
    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: invite, error } = await supabase
      .from('story_invites')
      .insert({
        user_id: userId,
        invite_code: inviteCode,
        guest_email: data.guestEmail.toLowerCase().trim(),
        guest_name: data.guestName?.trim() || null,
        topic: data.topic?.trim() || null,
        message: data.message?.trim() || null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create invite:', error);
      return null;
    }

    this.logger.log(`Created invite ${invite.id} for ${data.guestEmail}`);
    return invite;
  }

  async getUserInvites(userId: string): Promise<StoryInvite[]> {
    const supabase = this.supabaseService.getClient();

    const { data: invites, error } = await supabase
      .from('story_invites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch invites:', error);
      return [];
    }

    return invites || [];
  }

  async getInviteById(userId: string, inviteId: string): Promise<StoryInvite | null> {
    const supabase = this.supabaseService.getClient();

    const { data: invite, error } = await supabase
      .from('story_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return invite;
  }

  async deleteInvite(userId: string, inviteId: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('story_invites')
      .delete()
      .eq('id', inviteId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to delete invite:', error);
      return false;
    }

    return true;
  }

  // ==================== PUBLIC INVITE ACCESS ====================

  async getInviteByCode(inviteCode: string): Promise<InviteWithOwner | null> {
    const supabase = this.supabaseService.getClient();

    const { data: invite, error } = await supabase
      .from('story_invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (error || !invite) {
      return null;
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return null;
    }

    // Check if max uses reached
    if (invite.use_count >= invite.max_uses) {
      return null;
    }

    // Get owner profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, preferred_name')
      .eq('id', invite.user_id)
      .single();

    return {
      ...invite,
      owner_name: profile?.preferred_name || profile?.full_name || 'Someone',
    };
  }

  async markInviteViewed(inviteCode: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    await supabase
      .from('story_invites')
      .update({ status: 'viewed' })
      .eq('invite_code', inviteCode)
      .eq('status', 'pending');
  }

  // ==================== GUEST STORIES ====================

  async submitGuestStory(
    inviteCode: string,
    data: {
      guestName: string;
      guestEmail: string;
      title?: string;
      content: string;
      relationship?: string;
    },
  ): Promise<GuestStory | null> {
    const supabase = this.supabaseService.getClient();

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from('story_invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (inviteError || !invite) {
      this.logger.error('Invalid invite code:', inviteCode);
      return null;
    }

    // Validate invite is still valid
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      this.logger.error('Invite expired:', inviteCode);
      return null;
    }

    if (invite.use_count >= invite.max_uses) {
      this.logger.error('Invite max uses reached:', inviteCode);
      return null;
    }

    // Create guest story
    const { data: story, error: storyError } = await supabase
      .from('guest_stories')
      .insert({
        invite_id: invite.id,
        user_id: invite.user_id,
        guest_email: data.guestEmail.toLowerCase().trim(),
        guest_name: data.guestName.trim(),
        title: data.title?.trim() || null,
        content: data.content.trim(),
        relationship: data.relationship?.trim() || null,
      })
      .select()
      .single();

    if (storyError) {
      this.logger.error('Failed to create guest story:', storyError);
      return null;
    }

    // Update invite use count and status
    await supabase
      .from('story_invites')
      .update({
        use_count: invite.use_count + 1,
        status: 'completed',
      })
      .eq('id', invite.id);

    this.logger.log(`Guest story submitted: ${story.id} from ${data.guestEmail}`);
    return story;
  }

  async getGuestStories(userId: string): Promise<GuestStory[]> {
    const supabase = this.supabaseService.getClient();

    const { data: stories, error } = await supabase
      .from('guest_stories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch guest stories:', error);
      return [];
    }

    return stories || [];
  }

  async getPendingGuestStories(userId: string): Promise<GuestStory[]> {
    const supabase = this.supabaseService.getClient();

    const { data: stories, error } = await supabase
      .from('guest_stories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_approved', false)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch pending guest stories:', error);
      return [];
    }

    return stories || [];
  }

  async approveGuestStory(
    userId: string,
    storyId: string,
    chapterId?: string,
  ): Promise<GuestStory | null> {
    const supabase = this.supabaseService.getClient();

    // First get the guest story
    const { data: guestStory, error: fetchError } = await supabase
      .from('guest_stories')
      .select('*')
      .eq('id', storyId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !guestStory) {
      this.logger.error('Failed to fetch guest story:', fetchError);
      return null;
    }

    // Create the story in chapter_stories (the actual memoir)
    const memoirStory = await this.memoirService.createStory({
      userId,
      chapterId: chapterId || undefined,
      title: guestStory.title || `Story from ${guestStory.guest_name}`,
      content: guestStory.content,
      summary: guestStory.relationship
        ? `Shared by ${guestStory.guest_name} (${guestStory.relationship})`
        : `Shared by ${guestStory.guest_name}`,
      sourceType: 'manual',
      sourceId: `guest:${storyId}`,
    });

    if (!memoirStory) {
      this.logger.error('Failed to create memoir story from guest story');
      return null;
    }

    // Mark guest story as approved
    const updateData: Record<string, unknown> = {
      is_approved: true,
      chapter_id: memoirStory.chapter_id,
    };

    const { data: story, error } = await supabase
      .from('guest_stories')
      .update(updateData)
      .eq('id', storyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to approve guest story:', error);
      return null;
    }

    this.logger.log(`Guest story ${storyId} approved and added to memoir as ${memoirStory.id}`);
    return story;
  }

  async rejectGuestStory(userId: string, storyId: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('guest_stories')
      .update({ is_active: false })
      .eq('id', storyId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to reject guest story:', error);
      return false;
    }

    return true;
  }

  // Helper to get full invite URL
  getInviteUrl(inviteCode: string): string {
    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
    return `${frontendUrl}/contribute/${inviteCode}`;
  }
}
