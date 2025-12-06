import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ElevenLabsService } from './elevenlabs.service';
import { CallsService } from '../calls/calls.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { User } from '@supabase/supabase-js';

@ApiTags('conversation')
@Controller('conversation')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ElevenLabsController {
  private readonly logger = new Logger(ElevenLabsController.name);

  constructor(
    private elevenlabsService: ElevenLabsService,
    private callsService: CallsService,
    private supabaseService: SupabaseService,
  ) {}

  @Get('signed-url')
  @ApiOperation({ summary: 'Get signed URL for WebSocket conversation' })
  async getSignedUrl(@CurrentUser() user: User) {
    const userId = user.id;

    // Check user balance
    const supabase = this.supabaseService.getClient();
    const { data: balance } = await supabase
      .from('user_balances')
      .select('balance_cents')
      .eq('user_id', userId)
      .single();

    if (!balance || balance.balance_cents <= 0) {
      return { error: 'Insufficient balance' };
    }

    const signedUrl = await this.elevenlabsService.getSignedUrl();
    if (!signedUrl) {
      return { error: 'Failed to get signed URL' };
    }

    return { signed_url: signedUrl };
  }

  @Get('token')
  @ApiOperation({ summary: 'Get conversation token for WebRTC' })
  async getConversationToken(@CurrentUser() user: User) {
    const userId = user.id;

    // Check user balance
    const supabase = this.supabaseService.getClient();
    const { data: balance } = await supabase
      .from('user_balances')
      .select('balance_cents')
      .eq('user_id', userId)
      .single();

    if (!balance || balance.balance_cents <= 0) {
      return { error: 'Insufficient balance' };
    }

    const token = await this.elevenlabsService.getConversationToken();
    if (!token) {
      return { error: 'Failed to get conversation token' };
    }

    return { token };
  }

  @Post('start')
  @ApiOperation({ summary: 'Start a new conversation session' })
  async startConversation(@CurrentUser() user: User) {
    const userId = user.id;

    // Check user balance
    const supabase = this.supabaseService.getClient();
    const { data: balance } = await supabase
      .from('user_balances')
      .select('balance_cents')
      .eq('user_id', userId)
      .single();

    if (!balance || balance.balance_cents <= 0) {
      return { error: 'Insufficient balance' };
    }

    // Get conversation token for WebRTC
    const token = await this.elevenlabsService.getConversationToken();
    if (!token) {
      return { error: 'Failed to get conversation token' };
    }

    // Create a call record
    const call = await this.callsService.createCall({
      twilio_call_sid: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      caller_phone: 'web',
      direction: 'outbound',
      user_id: userId,
    });

    if (!call) {
      return { error: 'Failed to create call record' };
    }

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_name, full_name')
      .eq('id', userId)
      .single();

    // Get user memories for context
    const { data: memories } = await supabase
      .from('user_memories')
      .select('content, category')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('importance_score', { ascending: false })
      .limit(10);

    const userName = profile?.preferred_name || profile?.full_name || 'there';
    const memoriesContext =
      memories && memories.length > 0
        ? memories.map((m) => `- [${m.category}] ${m.content}`).join('\n')
        : 'No memories yet.';

    return {
      token,
      call_id: call.id,
      agent_id: this.elevenlabsService.getAgentId(),
      context: {
        user_name: userName,
        memories: memoriesContext,
      },
    };
  }

  @Post('end')
  @ApiOperation({ summary: 'End a conversation session' })
  async endConversation(
    @CurrentUser() user: User,
    @Body() body: { call_id: string; duration_seconds: number },
  ) {
    const userId = user.id;
    const { call_id, duration_seconds } = body;

    // Update call record
    const supabase = this.supabaseService.getClient();

    // Calculate cost
    const costCents = Math.ceil(duration_seconds / 60) * 10; // $0.10 per minute

    // Update call
    await supabase
      .from('calls')
      .update({
        status: 'completed',
        duration_seconds,
        cost_cents: costCents,
        ended_at: new Date().toISOString(),
      })
      .eq('id', call_id)
      .eq('user_id', userId);

    // Deduct balance
    await supabase.rpc('deduct_balance', {
      p_user_id: userId,
      p_amount: costCents,
      p_call_id: call_id,
    });

    this.logger.log(
      `Conversation ended: ${call_id}, duration: ${duration_seconds}s, cost: ${costCents}c`,
    );

    return { success: true, cost_cents: costCents };
  }

  @Post('message')
  @ApiOperation({ summary: 'Store a conversation message' })
  async storeMessage(
    @Body()
    body: {
      call_id: string;
      role: 'user' | 'assistant';
      content: string;
    },
  ) {
    const { call_id, role, content } = body;

    const message = await this.callsService.addMessage(call_id, role, content);

    return { success: !!message, message_id: message?.id };
  }
}
