import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('calls')
@Controller('calls')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user call history' })
  async getCalls(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.callsService.getCallsByUserId(user.id, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      calls: result.calls,
      total: result.total,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get call details with transcript' })
  async getCall(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const call = await this.callsService.getCallById(id);

    if (!call || call.user_id !== user.id) {
      return { error: 'Call not found' };
    }

    const messages = await this.callsService.getMessages(id);

    return {
      call,
      messages,
    };
  }

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate an outbound call' })
  async initiateCall(
    @CurrentUser() user: { id: string },
    @Body() body: { phone_number?: string },
  ) {
    // Get user's primary phone number if not provided
    // For now, we require the phone number to be provided
    if (!body.phone_number) {
      return { error: 'Phone number is required' };
    }

    const result = await this.callsService.initiateOutboundCall(
      user.id,
      body.phone_number,
    );

    if (!result) {
      return { error: 'Failed to initiate call' };
    }

    return {
      success: true,
      call_id: result.callId,
      call_sid: result.callSid,
    };
  }
}
