import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIService, ConversationMessage } from '../openai/openai.service';
import { MemoirService } from '../memoir/memoir.service';
import { QueueService } from '../queue/queue.service';

export interface ChatSession {
  id: string;
  user_id: string;
  type: 'text';
  status: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private supabaseService: SupabaseService,
    private openaiService: OpenAIService,
    private memoirService: MemoirService,
    private queueService: QueueService,
  ) {}

  async createSession(userId: string): Promise<ChatSession | null> {
    const supabase = this.supabaseService.getClient();

    // Create a session using the calls table with type 'text'
    const { data: session, error } = await supabase
      .from('calls')
      .insert({
        user_id: userId,
        twilio_call_sid: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        caller_phone: 'text_chat',
        direction: 'inbound',
        status: 'in-progress',
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create chat session:', error);
      return null;
    }

    this.logger.log(`Created text chat session: ${session.id}`);
    return {
      id: session.id,
      user_id: session.user_id,
      type: 'text',
      status: session.status,
      message_count: 0,
      created_at: session.created_at,
      updated_at: session.created_at,
    };
  }

  async getActiveSession(userId: string): Promise<ChatSession | null> {
    const supabase = this.supabaseService.getClient();

    const { data: session } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .eq('caller_phone', 'text_chat')
      .eq('status', 'in-progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!session) return null;

    // Get message count
    const { count } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
      .eq('call_id', session.id);

    return {
      id: session.id,
      user_id: session.user_id,
      type: 'text',
      status: session.status,
      message_count: count || 0,
      created_at: session.created_at,
      updated_at: session.started_at,
    };
  }

  async getOrCreateSession(userId: string): Promise<ChatSession> {
    let session = await this.getActiveSession(userId);

    if (!session) {
      session = await this.createSession(userId);
    }

    if (!session) {
      throw new Error('Failed to create chat session');
    }

    return session;
  }

  async sendMessage(
    userId: string,
    sessionId: string,
    content: string,
  ): Promise<{ response: string; messageId: string }> {
    const supabase = this.supabaseService.getClient();

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('calls')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!session) {
      throw new Error('Session not found');
    }

    // Store user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('conversation_messages')
      .insert({
        call_id: sessionId,
        role: 'user',
        content,
        timestamp_ms: Date.now(),
      })
      .select()
      .single();

    if (userMsgError) {
      this.logger.error('Failed to store user message:', userMsgError);
      throw new Error('Failed to store message');
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('role, content')
      .eq('call_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    const conversationHistory: ConversationMessage[] = (messages || []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_name, full_name')
      .eq('id', userId)
      .single();

    const userName = profile?.preferred_name || profile?.full_name || 'friend';

    // Get recent stories for context
    const chapters = await this.memoirService.getChaptersWithStories(userId);
    const recentStories = chapters
      .flatMap(c => c.stories)
      .slice(0, 5)
      .map(s => ({ content: s.summary || s.content.substring(0, 200), category: s.title || 'story' }));

    // Build system prompt
    const systemPrompt = this.openaiService.buildSystemPrompt(userName, recentStories);

    // Get AI response
    const aiResponse = await this.openaiService.chat(conversationHistory, {
      systemPrompt,
      maxTokens: 500,
      temperature: 0.7,
    });

    const responseContent = aiResponse || "I'm sorry, I couldn't process that. Could you try again?";

    // Store assistant message
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from('conversation_messages')
      .insert({
        call_id: sessionId,
        role: 'assistant',
        content: responseContent,
        timestamp_ms: Date.now(),
      })
      .select()
      .single();

    if (assistantMsgError) {
      this.logger.error('Failed to store assistant message:', assistantMsgError);
    }

    return {
      response: responseContent,
      messageId: assistantMessage?.id || userMessage.id,
    };
  }

  async getSessionMessages(
    userId: string,
    sessionId: string,
  ): Promise<ChatMessage[]> {
    const supabase = this.supabaseService.getClient();

    // Verify session belongs to user
    const { data: session } = await supabase
      .from('calls')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!session) {
      return [];
    }

    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('id, call_id, role, content, created_at')
      .eq('call_id', sessionId)
      .order('created_at', { ascending: true });

    return (messages || []).map(m => ({
      id: m.id,
      session_id: m.call_id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      created_at: m.created_at,
    }));
  }

  async endSession(userId: string, sessionId: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('calls')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Failed to end session:', error);
      return false;
    }

    // Trigger final story extraction
    await this.queueService.addJob('extract-stories', {
      callId: sessionId,
      userId,
    });

    return true;
  }

  async getUserSessions(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ sessions: ChatSession[]; total: number }> {
    const supabase = this.supabaseService.getClient();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const { data: sessions, error, count } = await supabase
      .from('calls')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('caller_phone', 'text_chat')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to fetch sessions:', error);
      return { sessions: [], total: 0 };
    }

    return {
      sessions: (sessions || []).map(s => ({
        id: s.id,
        user_id: s.user_id,
        type: 'text' as const,
        status: s.status,
        message_count: 0, // Would need separate query
        created_at: s.created_at,
        updated_at: s.started_at,
      })),
      total: count || 0,
    };
  }
}
