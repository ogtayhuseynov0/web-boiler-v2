import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIService, ConversationMessage } from '../openai/openai.service';

export interface GuestChatSession {
  id: string;
  invite_id: string;
  guest_email: string;
  status: string;
  message_count: number;
  created_at: string;
}

export interface GuestChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

@Injectable()
export class GuestChatService {
  private readonly logger = new Logger(GuestChatService.name);

  constructor(
    private supabaseService: SupabaseService,
    private openaiService: OpenAIService,
  ) {}

  private buildGuestSystemPrompt(
    ownerName: string,
    guestName: string,
    topic?: string,
  ): string {
    return `You are a warm, friendly interviewer helping ${guestName} share memories and stories about ${ownerName} for ${ownerName}'s memoir.

Your role is to:
1. Ask thoughtful follow-up questions to draw out rich, detailed stories
2. Help them remember specific moments, conversations, and feelings
3. Encourage vivid descriptions and emotional details
4. Guide them to share what makes ${ownerName} special to them

${topic ? `The suggested topic for this story is: "${topic}". Start by gently guiding the conversation toward this topic.` : ''}

Keep your responses warm but concise. Ask one question at a time. When they've shared a complete story, summarize it back to confirm you captured it correctly.

Remember: You're collecting stories ABOUT ${ownerName}, not from them. ${guestName} is sharing their perspective and memories of ${ownerName}.`;
  }

  async getOrCreateSession(
    inviteId: string,
    guestEmail: string,
  ): Promise<GuestChatSession | null> {
    const supabase = this.supabaseService.getClient();

    // Check for existing active session
    const { data: existingSession } = await supabase
      .from('guest_chat_sessions')
      .select('*')
      .eq('invite_id', inviteId)
      .eq('guest_email', guestEmail)
      .eq('status', 'active')
      .single();

    if (existingSession) {
      const { count } = await supabase
        .from('guest_chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', existingSession.id);

      return {
        ...existingSession,
        message_count: count || 0,
      };
    }

    // Create new session
    const { data: newSession, error } = await supabase
      .from('guest_chat_sessions')
      .insert({
        invite_id: inviteId,
        guest_email: guestEmail,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create guest chat session:', error);
      return null;
    }

    return {
      ...newSession,
      message_count: 0,
    };
  }

  async getSessionMessages(sessionId: string): Promise<GuestChatMessage[]> {
    const supabase = this.supabaseService.getClient();

    const { data: messages, error } = await supabase
      .from('guest_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error('Failed to fetch messages:', error);
      return [];
    }

    return messages || [];
  }

  async storeMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('guest_chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
      });

    if (error) {
      this.logger.error('Failed to store message:', error);
    }
  }

  async sendMessage(
    sessionId: string,
    guestEmail: string,
    content: string,
    inviteId: string,
  ): Promise<{ response: string; messageId: string } | null> {
    const supabase = this.supabaseService.getClient();

    // Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from('guest_chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      this.logger.error('Session not found:', sessionError);
      return null;
    }

    // Verify email matches
    if (session.guest_email !== guestEmail) {
      this.logger.error(`Email mismatch: ${session.guest_email} vs ${guestEmail}`);
      return null;
    }

    // Store user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('guest_chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content,
      })
      .select()
      .single();

    if (userMsgError) {
      this.logger.error('Failed to store user message:', userMsgError);
      return null;
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from('guest_chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    const conversationHistory: ConversationMessage[] = (messages || []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Get invite details for context
    const { data: invite } = await supabase
      .from('story_invites')
      .select('*, profiles!story_invites_user_id_fkey(full_name, preferred_name)')
      .eq('id', inviteId)
      .single();

    const ownerProfile = invite?.profiles as { full_name?: string; preferred_name?: string } | null;
    const ownerName = ownerProfile?.preferred_name || ownerProfile?.full_name || 'them';
    const guestName = invite?.guest_name || 'friend';

    // Build system prompt
    const systemPrompt = this.buildGuestSystemPrompt(ownerName, guestName, invite?.topic);

    // Get AI response
    const aiResponse = await this.openaiService.chat(conversationHistory, {
      systemPrompt,
      maxTokens: 500,
      temperature: 0.7,
    });

    const responseContent = aiResponse || "I'm sorry, could you tell me more about that?";

    // Store assistant message
    const { error: assistantMsgError } = await supabase
      .from('guest_chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: responseContent,
      });

    if (assistantMsgError) {
      this.logger.error('Failed to store assistant message:', assistantMsgError);
    }

    return {
      response: responseContent,
      messageId: userMessage.id,
    };
  }

  async extractStoryFromSession(
    sessionId: string,
    inviteId: string,
    guestEmail: string,
    guestName: string,
  ): Promise<{ title: string; content: string; relationship?: string } | null> {
    const supabase = this.supabaseService.getClient();

    // Get all messages
    const { data: messages } = await supabase
      .from('guest_chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!messages || messages.length < 2) {
      return null;
    }

    // Get invite for owner name
    const { data: invite } = await supabase
      .from('story_invites')
      .select('*, profiles!story_invites_user_id_fkey(full_name, preferred_name)')
      .eq('id', inviteId)
      .single();

    const ownerProfile = invite?.profiles as { full_name?: string; preferred_name?: string } | null;
    const ownerName = ownerProfile?.preferred_name || ownerProfile?.full_name || 'them';

    // Format conversation for extraction
    const conversationText = messages
      .map(m => `${m.role === 'user' ? guestName : 'Interviewer'}: ${m.content}`)
      .join('\n\n');

    // Use OpenAI to extract and format the story
    const extractionPrompt = `Based on this conversation where ${guestName} shared memories about ${ownerName}, extract and write a cohesive story.

CONVERSATION:
${conversationText}

Please write:
1. A short, evocative title for the story
2. The story itself, written in first person from ${guestName}'s perspective, capturing the memories and feelings they shared
3. Their relationship to ${ownerName} if mentioned

Format your response as JSON:
{
  "title": "Story title here",
  "content": "The full story text here...",
  "relationship": "Their relationship if mentioned, or null"
}`;

    const response = await this.openaiService.chat(
      [{ role: 'user', content: extractionPrompt }],
      { maxTokens: 1500, temperature: 0.3 }
    );

    try {
      // Parse JSON response
      const jsonMatch = response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.error('Failed to parse story extraction:', e);
    }

    return null;
  }

  async endSessionAndSaveStory(
    sessionId: string,
    inviteId: string,
    userId: string,
    guestEmail: string,
    guestName: string,
  ): Promise<{ success: boolean; storyId?: string }> {
    const supabase = this.supabaseService.getClient();

    // Extract story from conversation
    const extracted = await this.extractStoryFromSession(
      sessionId,
      inviteId,
      guestEmail,
      guestName,
    );

    if (!extracted) {
      return { success: false };
    }

    // Save to guest_stories
    const { data: story, error } = await supabase
      .from('guest_stories')
      .insert({
        invite_id: inviteId,
        user_id: userId,
        guest_email: guestEmail.toLowerCase(),
        guest_name: guestName,
        title: extracted.title,
        content: extracted.content,
        relationship: extracted.relationship,
        is_approved: false,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to save guest story:', error);
      return { success: false };
    }

    // Update session status
    await supabase
      .from('guest_chat_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    // Update invite status
    await supabase
      .from('story_invites')
      .update({ status: 'completed' })
      .eq('id', inviteId);

    return { success: true, storyId: story.id };
  }
}
