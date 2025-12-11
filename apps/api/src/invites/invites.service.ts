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
  memoir_story_id: string | null;
  is_approved: boolean;
  is_active: boolean;
  version: number;
  last_approved_at: string | null;
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

  // ==================== AUTHENTICATED GUEST METHODS ====================

  async getGuestStoryByInvite(
    inviteCode: string,
    guestEmail: string,
  ): Promise<{ story: GuestStory | null; invite: InviteWithOwner | null }> {
    const supabase = this.supabaseService.getClient();

    // Get the invite directly (not using getInviteByCode which checks use limits)
    const { data: inviteData, error: inviteError } = await supabase
      .from('story_invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (inviteError || !inviteData) {
      return { story: null, invite: null };
    }

    // Verify email matches (case-insensitive)
    if (inviteData.guest_email.toLowerCase() !== guestEmail.toLowerCase()) {
      this.logger.warn(`Email mismatch for invite ${inviteCode}: expected ${inviteData.guest_email}, got ${guestEmail}`);
      return { story: null, invite: null };
    }

    // Get existing story if any
    const { data: story } = await supabase
      .from('guest_stories')
      .select('*')
      .eq('invite_id', inviteData.id)
      .eq('is_active', true)
      .single();

    // Get owner profile for display
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, preferred_name')
      .eq('id', inviteData.user_id)
      .single();

    const invite: InviteWithOwner = {
      ...inviteData,
      owner_name: profile?.preferred_name || profile?.full_name || 'Someone',
    };

    return { story: story || null, invite };
  }

  async updateGuestStory(
    inviteCode: string,
    guestEmail: string,
    data: {
      guestName: string;
      title?: string;
      content: string;
      relationship?: string;
    },
  ): Promise<GuestStory | null> {
    const supabase = this.supabaseService.getClient();

    // Verify invite and get existing story
    const { story: existingStory, invite } = await this.getGuestStoryByInvite(inviteCode, guestEmail);

    if (!invite) {
      this.logger.error('Invalid invite or email mismatch');
      return null;
    }

    if (!existingStory) {
      // No existing story, create new one
      return this.submitGuestStory(inviteCode, {
        guestName: data.guestName,
        guestEmail,
        title: data.title,
        content: data.content,
        relationship: data.relationship,
      });
    }

    // Update existing story and mark as needing re-approval
    const { data: updatedStory, error } = await supabase
      .from('guest_stories')
      .update({
        guest_name: data.guestName.trim(),
        title: data.title?.trim() || null,
        content: data.content.trim(),
        relationship: data.relationship?.trim() || null,
        is_approved: false, // Requires re-approval
        version: existingStory.version + 1,
      })
      .eq('id', existingStory.id)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update guest story:', error);
      return null;
    }

    this.logger.log(`Guest story updated: ${updatedStory.id} (v${updatedStory.version}) - awaiting re-approval`);
    return updatedStory;
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

    let memoirStoryId = guestStory.memoir_story_id;

    // Check if this is an edit (has existing memoir_story_id) or new submission
    if (memoirStoryId) {
      // Update existing memoir story
      const updatedStory = await this.memoirService.updateStory(userId, memoirStoryId, {
        title: guestStory.title || `Story from ${guestStory.guest_name}`,
        content: guestStory.content,
        summary: guestStory.relationship
          ? `Shared by ${guestStory.guest_name} (${guestStory.relationship})`
          : `Shared by ${guestStory.guest_name}`,
        chapterId: chapterId || undefined,
      });

      if (!updatedStory) {
        this.logger.error('Failed to update memoir story from guest story edit');
        return null;
      }

      this.logger.log(`Guest story ${storyId} edit approved - memoir story ${memoirStoryId} updated`);
    } else {
      // Create new memoir story
      const memoirStory = await this.memoirService.createStory({
        userId,
        chapterId: chapterId || undefined,
        title: guestStory.title || `Story from ${guestStory.guest_name}`,
        content: guestStory.content,
        summary: guestStory.relationship
          ? `Shared by ${guestStory.guest_name} (${guestStory.relationship})`
          : `Shared by ${guestStory.guest_name}`,
        sourceType: 'guest',
        sourceId: `guest:${storyId}`,
      });

      if (!memoirStory) {
        this.logger.error('Failed to create memoir story from guest story');
        return null;
      }

      memoirStoryId = memoirStory.id;
      this.logger.log(`Guest story ${storyId} approved - new memoir story ${memoirStoryId} created`);
    }

    // Mark guest story as approved and link to memoir story
    const { data: story, error } = await supabase
      .from('guest_stories')
      .update({
        is_approved: true,
        memoir_story_id: memoirStoryId,
        chapter_id: chapterId || guestStory.chapter_id,
        last_approved_at: new Date().toISOString(),
      })
      .eq('id', storyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to approve guest story:', error);
      return null;
    }

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
