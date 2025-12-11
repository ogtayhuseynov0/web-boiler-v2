import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InvitesService } from './invites.service';
import type { User } from '@supabase/supabase-js';

@Controller('invites')
export class InvitesController {
  constructor(private invitesService: InvitesService) {}

  // ==================== AUTHENTICATED USER ROUTES ====================

  @Get()
  @UseGuards(SupabaseAuthGuard)
  async getInvites(@CurrentUser() user: User) {
    try {
      const invites = await this.invitesService.getUserInvites(user.id);
      return { invites };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch invites',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async createInvite(
    @CurrentUser() user: User,
    @Body()
    body: {
      guest_email: string;
      guest_name?: string;
      topic?: string;
      message?: string;
      expires_in_days?: number;
    },
  ) {
    if (!body.guest_email?.trim()) {
      throw new HttpException('Guest email is required', HttpStatus.BAD_REQUEST);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.guest_email)) {
      throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
    }

    try {
      const invite = await this.invitesService.createInvite(user.id, {
        guestEmail: body.guest_email,
        guestName: body.guest_name,
        topic: body.topic,
        message: body.message,
        expiresInDays: body.expires_in_days,
      });

      if (!invite) {
        throw new HttpException(
          'Failed to create invite',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        invite,
        invite_url: this.invitesService.getInviteUrl(invite.invite_code),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to create invite',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(SupabaseAuthGuard)
  async getInvite(@CurrentUser() user: User, @Param('id') inviteId: string) {
    try {
      const invite = await this.invitesService.getInviteById(user.id, inviteId);
      if (!invite) {
        throw new HttpException('Invite not found', HttpStatus.NOT_FOUND);
      }

      return {
        invite,
        invite_url: this.invitesService.getInviteUrl(invite.invite_code),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to fetch invite',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  async deleteInvite(@CurrentUser() user: User, @Param('id') inviteId: string) {
    try {
      const success = await this.invitesService.deleteInvite(user.id, inviteId);
      return { success };
    } catch (error) {
      throw new HttpException(
        'Failed to delete invite',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== GUEST STORIES ====================

  @Get('stories/pending')
  @UseGuards(SupabaseAuthGuard)
  async getPendingStories(@CurrentUser() user: User) {
    try {
      const stories = await this.invitesService.getPendingGuestStories(user.id);
      return { stories };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch pending stories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stories/all')
  @UseGuards(SupabaseAuthGuard)
  async getAllGuestStories(@CurrentUser() user: User) {
    try {
      const stories = await this.invitesService.getGuestStories(user.id);
      return { stories };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch guest stories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('stories/:id/approve')
  @UseGuards(SupabaseAuthGuard)
  async approveStory(
    @CurrentUser() user: User,
    @Param('id') storyId: string,
    @Body() body: { chapter_id?: string },
  ) {
    try {
      const story = await this.invitesService.approveGuestStory(
        user.id,
        storyId,
        body.chapter_id,
      );

      if (!story) {
        throw new HttpException('Story not found', HttpStatus.NOT_FOUND);
      }

      return { story };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to approve story',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('stories/:id/reject')
  @UseGuards(SupabaseAuthGuard)
  async rejectStory(@CurrentUser() user: User, @Param('id') storyId: string) {
    try {
      const success = await this.invitesService.rejectGuestStory(user.id, storyId);
      return { success };
    } catch (error) {
      throw new HttpException(
        'Failed to reject story',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== AUTHENTICATED GUEST ROUTES ====================

  @Get('guest/:code')
  @UseGuards(SupabaseAuthGuard)
  async getGuestInvite(
    @CurrentUser() user: User,
    @Param('code') inviteCode: string,
  ) {
    try {
      const { story, invite } = await this.invitesService.getGuestStoryByInvite(
        inviteCode,
        user.email || '',
      );

      if (!invite) {
        throw new HttpException(
          'Invite not found or email mismatch',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        invite: {
          id: invite.id,
          owner_name: invite.owner_name,
          guest_name: invite.guest_name,
          guest_email: invite.guest_email,
          topic: invite.topic,
          message: invite.message,
        },
        story: story
          ? {
              id: story.id,
              guest_name: story.guest_name,
              title: story.title,
              content: story.content,
              relationship: story.relationship,
              is_approved: story.is_approved,
              version: story.version,
            }
          : null,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to fetch invite',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('guest/:code')
  @UseGuards(SupabaseAuthGuard)
  async updateGuestStory(
    @CurrentUser() user: User,
    @Param('code') inviteCode: string,
    @Body()
    body: {
      guest_name: string;
      title?: string;
      content: string;
      relationship?: string;
    },
  ) {
    if (!body.guest_name?.trim()) {
      throw new HttpException('Your name is required', HttpStatus.BAD_REQUEST);
    }

    if (!body.content?.trim()) {
      throw new HttpException('Story content is required', HttpStatus.BAD_REQUEST);
    }

    if (body.content.trim().length < 50) {
      throw new HttpException(
        'Story must be at least 50 characters',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const story = await this.invitesService.updateGuestStory(
        inviteCode,
        user.email || '',
        {
          guestName: body.guest_name,
          title: body.title,
          content: body.content,
          relationship: body.relationship,
        },
      );

      if (!story) {
        throw new HttpException(
          'Invite not found or email mismatch',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        story,
        message: story.version > 1
          ? 'Your story has been updated and is pending re-approval'
          : 'Your story has been submitted for review',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to save story',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== PUBLIC ROUTES (NO AUTH) ====================

  @Get('public/:code')
  async getPublicInvite(@Param('code') inviteCode: string) {
    try {
      const invite = await this.invitesService.getInviteByCode(inviteCode);

      if (!invite) {
        throw new HttpException(
          'Invite not found or expired',
          HttpStatus.NOT_FOUND,
        );
      }

      // Mark as viewed
      await this.invitesService.markInviteViewed(inviteCode);

      return {
        invite: {
          id: invite.id,
          owner_name: invite.owner_name,
          guest_name: invite.guest_name,
          topic: invite.topic,
          message: invite.message,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to fetch invite',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('public/:code/submit')
  async submitStory(
    @Param('code') inviteCode: string,
    @Body()
    body: {
      guest_name: string;
      guest_email: string;
      title?: string;
      content: string;
      relationship?: string;
    },
  ) {
    if (!body.guest_name?.trim()) {
      throw new HttpException('Your name is required', HttpStatus.BAD_REQUEST);
    }

    if (!body.guest_email?.trim()) {
      throw new HttpException('Your email is required', HttpStatus.BAD_REQUEST);
    }

    if (!body.content?.trim()) {
      throw new HttpException('Story content is required', HttpStatus.BAD_REQUEST);
    }

    if (body.content.trim().length < 50) {
      throw new HttpException(
        'Story must be at least 50 characters',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const story = await this.invitesService.submitGuestStory(inviteCode, {
        guestName: body.guest_name,
        guestEmail: body.guest_email,
        title: body.title,
        content: body.content,
        relationship: body.relationship,
      });

      if (!story) {
        throw new HttpException(
          'Invite not found or expired',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: 'Your story has been submitted for review',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to submit story',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
