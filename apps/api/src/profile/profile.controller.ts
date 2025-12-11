import { Controller, Get, Patch, Body, UseGuards, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemoirService } from '../memoir/memoir.service';
import type { User } from '@supabase/supabase-js';

@ApiTags('profile')
@ApiBearerAuth('JWT')
@Controller('profile')
export class ProfileController {
  constructor(
    private profileService: ProfileService,
    private memoirService: MemoirService,
  ) {}

  // ==================== AUTHENTICATED ROUTES ====================

  @Get()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() body: { email?: string; full_name?: string; avatar_url?: string },
  ) {
    return this.profileService.updateProfile(user.id, body);
  }

  @Get('focus-topics')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Get story focus topics' })
  async getFocusTopics(@CurrentUser() user: User) {
    const topics = await this.profileService.getStoryFocusTopics(user.id);
    return { topics };
  }

  @Patch('focus-topics')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Update story focus topics' })
  async updateFocusTopics(
    @CurrentUser() user: User,
    @Body() body: { topics: string[] },
  ) {
    const topics = await this.profileService.updateStoryFocusTopics(
      user.id,
      body.topics,
    );
    return { topics };
  }

  // ==================== MEMOIR SHARING ====================

  @Get('sharing')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Get memoir sharing settings' })
  async getSharingSettings(@CurrentUser() user: User) {
    return this.profileService.getMemoirSharingSettings(user.id);
  }

  @Patch('sharing')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Update memoir sharing settings' })
  async updateSharingSettings(
    @CurrentUser() user: User,
    @Body() body: { is_memoir_public?: boolean; memoir_title?: string; memoir_description?: string },
  ) {
    return this.profileService.updateMemoirSharingSettings(user.id, body);
  }

  @Patch('sharing/slug')
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({ summary: 'Update memoir share URL slug' })
  async updateSlug(
    @CurrentUser() user: User,
    @Body() body: { slug: string },
  ) {
    try {
      const slug = await this.profileService.updateMemoirSlug(user.id, body.slug);
      return { slug };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ==================== PUBLIC MEMOIR ACCESS (NO AUTH) ====================

  @Get('public/memoirs')
  @ApiOperation({ summary: 'List all public memoirs' })
  async getPublicMemoirs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.profileService.getPublicMemoirs(
      parseInt(limit || '20', 10),
      parseInt(offset || '0', 10),
    );
  }

  @Get('public/memoirs/slugs')
  @ApiOperation({ summary: 'Get all public memoir slugs (for sitemap)' })
  async getPublicMemoirSlugs() {
    const slugs = await this.profileService.getAllPublicMemoirSlugs();
    return { slugs };
  }

  @Get('public/memoir/:slug')
  @ApiOperation({ summary: 'Get public memoir by slug' })
  async getPublicMemoir(@Param('slug') slug: string) {
    const profile = await this.profileService.getPublicMemoirBySlug(slug);
    if (!profile) {
      throw new BadRequestException('Memoir not found or is private');
    }

    // Get chapters with stories for this user
    const chapters = await this.memoirService.getChaptersWithStories(profile.id);
    const chaptersWithStories = chapters.filter(c => c.stories && c.stories.length > 0);

    return {
      owner: {
        name: profile.preferred_name || profile.full_name,
        avatar_url: profile.avatar_url,
        memoir_title: profile.memoir_title,
        memoir_description: profile.memoir_description,
      },
      chapters: chaptersWithStories.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        time_period_start: c.time_period_start,
        time_period_end: c.time_period_end,
        stories: c.stories.map(s => ({
          id: s.id,
          title: s.title,
          content: s.content,
          time_period: s.time_period,
        })),
      })),
    };
  }
}
