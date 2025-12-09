import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';

@ApiTags('profile')
@ApiBearerAuth('JWT')
@Controller('profile')
@UseGuards(SupabaseAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() body: { email?: string; full_name?: string; avatar_url?: string },
  ) {
    return this.profileService.updateProfile(user.id, body);
  }

  @Get('focus-topics')
  @ApiOperation({ summary: 'Get story focus topics' })
  async getFocusTopics(@CurrentUser() user: User) {
    const topics = await this.profileService.getStoryFocusTopics(user.id);
    return { topics };
  }

  @Patch('focus-topics')
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
}
