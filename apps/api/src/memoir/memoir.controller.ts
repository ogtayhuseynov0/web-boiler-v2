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

  @Get('chapters')
  async getChapters(@CurrentUser() user: User) {
    try {
      const chapters = await this.memoirService.getChaptersWithContent(user.id);
      return { chapters };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch chapters',
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
      throw new HttpException(
        (error as Error).message || 'Failed to create chapter',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('chapters/:id/regenerate')
  async regenerateChapter(
    @CurrentUser() user: User,
    @Param('id') chapterId: string,
  ) {
    try {
      const content = await this.memoirService.generateChapterNarrative(
        user.id,
        chapterId,
      );

      return {
        success: !!content,
        content,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to regenerate chapter',
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
      throw new HttpException(
        'Invalid chapters array',
        HttpStatus.BAD_REQUEST,
      );
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

  @Post('regenerate-all')
  async regenerateAllChapters(@CurrentUser() user: User) {
    try {
      const chapters = await this.memoirService.getOrCreateChapters(user.id);

      // Regenerate each chapter with content
      const results = await Promise.all(
        chapters
          .filter((c) => c.memory_count > 0)
          .map(async (chapter) => {
            const content = await this.memoirService.generateChapterNarrative(
              user.id,
              chapter.id,
            );
            return {
              chapterId: chapter.id,
              title: chapter.title,
              success: !!content,
            };
          }),
      );

      return {
        success: true,
        regenerated: results.filter((r) => r.success).length,
        results,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to regenerate chapters',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
