import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MemoriesService, Memory } from './memories.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('memories')
@Controller('api/memories')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user memories' })
  async getMemories(
    @CurrentUser() user: { id: string },
    @Query('category') category?: Memory['category'],
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.memoriesService.getMemoriesByUserId(user.id, {
      category,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      memories: result.memories,
      total: result.total,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search memories semantically' })
  async searchMemories(
    @CurrentUser() user: { id: string },
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      return { memories: [] };
    }

    const memories = await this.memoriesService.searchSimilarMemories(
      user.id,
      query,
      limit ? parseInt(limit, 10) : 10,
    );

    return { memories };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific memory' })
  async getMemory(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const memory = await this.memoriesService.getMemoryById(id, user.id);

    if (!memory) {
      return { error: 'Memory not found' };
    }

    return { memory };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a memory' })
  async deleteMemory(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    const success = await this.memoriesService.deleteMemory(id, user.id);

    if (!success) {
      return { error: 'Failed to delete memory' };
    }

    return { success: true };
  }
}
