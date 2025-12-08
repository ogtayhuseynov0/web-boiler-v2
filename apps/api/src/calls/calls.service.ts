import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TwilioService } from '../twilio/twilio.service';

export interface Call {
  id: string;
  user_id: string | null;
  twilio_call_sid: string;
  caller_phone: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration_seconds: number;
  cost_cents: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  call_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audio_url: string | null;
  timestamp_ms: number;
  created_at: string;
}

export interface CreateCallDto {
  twilio_call_sid: string;
  caller_phone: string;
  direction: 'inbound' | 'outbound';
  user_id?: string;
}

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private twilioService: TwilioService,
  ) {}

  async createCall(data: CreateCallDto): Promise<Call | null> {
    const supabase = this.supabaseService.getClient();

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        twilio_call_sid: data.twilio_call_sid,
        caller_phone: data.caller_phone,
        direction: data.direction,
        user_id: data.user_id || null,
        status: 'initiated',
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create call:', error);
      return null;
    }

    return call;
  }

  async getCallByTwilioSid(twilioCallSid: string): Promise<Call | null> {
    const supabase = this.supabaseService.getClient();

    const { data: call, error } = await supabase
      .from('calls')
      .select('*')
      .eq('twilio_call_sid', twilioCallSid)
      .single();

    if (error) {
      return null;
    }

    return call;
  }

  async getCallById(id: string): Promise<Call | null> {
    const supabase = this.supabaseService.getClient();

    const { data: call, error } = await supabase
      .from('calls')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return call;
  }

  async getCallsByUserId(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ calls: Call[]; total: number }> {
    const supabase = this.supabaseService.getClient();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const { data: calls, error, count } = await supabase
      .from('calls')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .neq('caller_phone', 'text_chat') // Exclude text chat sessions
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to fetch calls:', error);
      return { calls: [], total: 0 };
    }

    return { calls: calls || [], total: count || 0 };
  }

  async updateCallStatus(
    twilioCallSid: string,
    status: string,
    updates?: Partial<Pick<Call, 'duration_seconds' | 'ended_at' | 'user_id'>>,
  ): Promise<Call | null> {
    const supabase = this.supabaseService.getClient();

    const { data: call, error } = await supabase
      .from('calls')
      .update({
        status,
        ...updates,
      })
      .eq('twilio_call_sid', twilioCallSid)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update call status:', error);
      return null;
    }

    return call;
  }

  async addMessage(
    callId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    options?: {
      audioUrl?: string;
      timestampMs?: number;
      sequenceIndex?: number;
    },
  ): Promise<ConversationMessage | null> {
    const supabase = this.supabaseService.getClient();

    // Use provided timestamp, or generate one with sequence offset to ensure ordering
    const baseTimestamp = options?.timestampMs ?? Date.now();
    const sequenceOffset = options?.sequenceIndex ?? 0;
    const timestamp = baseTimestamp + sequenceOffset;

    const { data: message, error } = await supabase
      .from('conversation_messages')
      .insert({
        call_id: callId,
        role,
        content,
        audio_url: options?.audioUrl || null,
        timestamp_ms: timestamp,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to add message:', error);
      return null;
    }

    return message;
  }

  async getMessages(callId: string): Promise<ConversationMessage[]> {
    const supabase = this.supabaseService.getClient();

    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('call_id', callId)
      .order('timestamp_ms', { ascending: true });

    if (error) {
      this.logger.error('Failed to fetch messages:', error);
      return [];
    }

    return messages || [];
  }

  async initiateOutboundCall(
    userId: string,
    phoneNumber: string,
  ): Promise<{ callSid: string; callId: string } | null> {
    const result = await this.twilioService.initiateCall(phoneNumber);
    if (!result) {
      return null;
    }

    const call = await this.createCall({
      twilio_call_sid: result.callSid,
      caller_phone: phoneNumber,
      direction: 'outbound',
      user_id: userId,
    });

    if (!call) {
      return null;
    }

    return { callSid: result.callSid, callId: call.id };
  }

  async calculateCallCost(durationSeconds: number): Promise<number> {
    // $0.10 per minute, rounded up
    const minutes = Math.ceil(durationSeconds / 60);
    return minutes * 10; // 10 cents per minute
  }

  async chargeForCall(callId: string): Promise<boolean> {
    const call = await this.getCallById(callId);
    if (!call || !call.user_id) {
      return false;
    }

    const costCents = await this.calculateCallCost(call.duration_seconds);
    const supabase = this.supabaseService.getClient();

    // Update call cost
    await supabase
      .from('calls')
      .update({ cost_cents: costCents })
      .eq('id', callId);

    // Deduct from balance
    const { error: balanceError } = await supabase.rpc('deduct_balance', {
      p_user_id: call.user_id,
      p_amount: costCents,
      p_call_id: callId,
    });

    if (balanceError) {
      this.logger.error('Failed to deduct balance:', balanceError);
      // Still return true as the call was successful
    }

    return true;
  }
}
