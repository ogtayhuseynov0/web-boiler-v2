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
import { MemoirService } from './memoir.service';
import type { User } from '@supabase/supabase-js';

@Controller('memoir')
@UseGuards(SupabaseAuthGuard)
export class MemoirController {
  constructor(private memoirService: MemoirService) {}

  // ==================== CHAPTERS ====================

  @Get('chapters')
  async getChapters(@CurrentUser() user: User) {
    try {
      const chapters = await this.memoirService.getChaptersWithStories(user.id);
      return { chapters };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch chapters',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('chapters/:id')
  async getChapter(@CurrentUser() user: User, @Param('id') chapterId: string) {
    try {
      const chapter = await this.memoirService.getChapterById(user.id, chapterId);
      if (!chapter) {
        throw new HttpException('Chapter not found', HttpStatus.NOT_FOUND);
      }
      return { chapter };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to fetch chapter',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('chapters')
  async createChapter(
    @CurrentUser() user: User,
    @Body()
    body: {
      title: string;
      description?: string;
      time_period_start?: string;
      time_period_end?: string;
    },
  ) {
    if (!body.title?.trim()) {
      throw new HttpException('Title is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const chapter = await this.memoirService.createChapter(user.id, {
        title: body.title.trim(),
        description: body.description?.trim(),
        timePeriodStart: body.time_period_start,
        timePeriodEnd: body.time_period_end,
      });

      if (!chapter) {
        throw new HttpException(
          'Failed to create chapter',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return { chapter };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        (error as Error).message || 'Failed to create chapter',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('chapters/:id')
  async updateChapter(
    @CurrentUser() user: User,
    @Param('id') chapterId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      time_period_start?: string;
      time_period_end?: string;
    },
  ) {
    try {
      const chapter = await this.memoirService.updateChapter(user.id, chapterId, {
        title: body.title?.trim(),
        description: body.description?.trim(),
        timePeriodStart: body.time_period_start,
        timePeriodEnd: body.time_period_end,
      });

      if (!chapter) {
        throw new HttpException('Chapter not found', HttpStatus.NOT_FOUND);
      }

      return { chapter };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to update chapter',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('chapters/reorder')
  async reorderChapters(
    @CurrentUser() user: User,
    @Body() body: { chapters: Array<{ id: string; order: number }> },
  ) {
    if (!Array.isArray(body.chapters)) {
      throw new HttpException('Invalid chapters array', HttpStatus.BAD_REQUEST);
    }

    try {
      const success = await this.memoirService.reorderChapters(
        user.id,
        body.chapters,
      );
      return { success };
    } catch (error) {
      throw new HttpException(
        'Failed to reorder chapters',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('chapters/:id')
  async deleteChapter(
    @CurrentUser() user: User,
    @Param('id') chapterId: string,
  ) {
    try {
      const success = await this.memoirService.deleteChapter(user.id, chapterId);
      return { success };
    } catch (error) {
      throw new HttpException(
        'Failed to delete chapter',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== STORIES ====================

  @Get('stories/by-source/:sourceId')
  async getStoriesBySource(
    @CurrentUser() user: User,
    @Param('sourceId') sourceId: string,
  ) {
    try {
      const stories = await this.memoirService.getStoriesBySource(
        user.id,
        sourceId,
      );
      return { stories };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch stories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stories/:id')
  async getStory(@CurrentUser() user: User, @Param('id') storyId: string) {
    try {
      const story = await this.memoirService.getStoryById(user.id, storyId);
      if (!story) {
        throw new HttpException('Story not found', HttpStatus.NOT_FOUND);
      }
      return { story };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to fetch story',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('stories')
  async createStory(
    @CurrentUser() user: User,
    @Body()
    body: {
      chapter_id?: string;
      title?: string;
      content: string;
      summary?: string;
      time_period?: string;
    },
  ) {
    if (!body.content?.trim()) {
      throw new HttpException('Content is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const story = await this.memoirService.createStory({
        userId: user.id,
        chapterId: body.chapter_id,
        title: body.title?.trim(),
        content: body.content.trim(),
        summary: body.summary?.trim(),
        timePeriod: body.time_period,
        sourceType: 'manual',
      });

      if (!story) {
        throw new HttpException(
          'Failed to create story',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return { story };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        (error as Error).message || 'Failed to create story',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('stories/:id')
  async updateStory(
    @CurrentUser() user: User,
    @Param('id') storyId: string,
    @Body()
    body: {
      title?: string;
      content?: string;
      summary?: string;
      time_period?: string;
      chapter_id?: string;
    },
  ) {
    try {
      const story = await this.memoirService.updateStory(user.id, storyId, {
        title: body.title?.trim(),
        content: body.content?.trim(),
        summary: body.summary?.trim(),
        timePeriod: body.time_period,
        chapterId: body.chapter_id,
      });

      if (!story) {
        throw new HttpException('Story not found', HttpStatus.NOT_FOUND);
      }

      return { story };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to update story',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('stories/:id')
  async deleteStory(@CurrentUser() user: User, @Param('id') storyId: string) {
    try {
      const success = await this.memoirService.deleteStory(user.id, storyId);
      return { success };
    } catch (error) {
      throw new HttpException(
        'Failed to delete story',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
