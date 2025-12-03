import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OpenAIService, ConversationMessage } from '../openai/openai.service';
import { ElevenLabsService } from '../elevenlabs/elevenlabs.service';
import { CallsService } from '../calls/calls.service';
import { CallSessionService, CallSession } from '../calls/call-session.service';
import { QueueService } from '../queue/queue.service';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  preferred_name: string | null;
  onboarding_completed: boolean;
}

interface UserMemory {
  id: string;
  content: string;
  category: string;
  importance_score: number;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private supabaseService: SupabaseService,
    private openaiService: OpenAIService,
    private elevenlabsService: ElevenLabsService,
    private callsService: CallsService,
    private callSessionService: CallSessionService,
    private queueService: QueueService,
  ) {}

  async findUserByPhone(phone: string): Promise<UserProfile | null> {
    const supabase = this.supabaseService.getClient();

    const { data: userPhone } = await supabase
      .from('user_phones')
      .select('user_id')
      .eq('phone_number', phone)
      .single();

    if (!userPhone) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userPhone.user_id)
      .single();

    return profile;
  }

  async getUserMemories(
    userId: string,
    limit: number = 10,
  ): Promise<UserMemory[]> {
    const supabase = this.supabaseService.getClient();

    const { data: memories } = await supabase
      .from('user_memories')
      .select('id, content, category, importance_score')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('importance_score', { ascending: false })
      .limit(limit);

    return memories || [];
  }

  async searchRelevantMemories(
    userId: string,
    query: string,
    limit: number = 5,
  ): Promise<UserMemory[]> {
    // Generate embedding for the query
    const embedding = await this.openaiService.generateEmbedding(query);
    if (!embedding) {
      return this.getUserMemories(userId, limit);
    }

    const supabase = this.supabaseService.getClient();

    // Use vector similarity search
    const { data: memories } = await supabase.rpc('match_memories', {
      query_embedding: embedding,
      match_user_id: userId,
      match_threshold: 0.7,
      match_count: limit,
    });

    return memories || [];
  }

  async checkUserBalance(userId: string): Promise<{
    hasBalance: boolean;
    balanceCents: number;
  }> {
    const supabase = this.supabaseService.getClient();

    const { data: balance } = await supabase
      .from('user_balances')
      .select('balance_cents')
      .eq('user_id', userId)
      .single();

    const balanceCents = balance?.balance_cents || 0;
    return {
      hasBalance: balanceCents > 0,
      balanceCents,
    };
  }

  async handleInboundCall(
    callSid: string,
    callerPhone: string,
  ): Promise<{
    greeting: string;
    audioUrl: string | null;
    session: CallSession;
  }> {
    // Look up user by phone number
    const user = await this.findUserByPhone(callerPhone);

    // Create call record
    const call = await this.callsService.createCall({
      twilio_call_sid: callSid,
      caller_phone: callerPhone,
      direction: 'inbound',
      user_id: user?.id,
    });

    if (!call) {
      throw new Error('Failed to create call record');
    }

    let greeting: string;
    let state: CallSession['state'];

    if (!user) {
      // New caller - start onboarding
      greeting =
        "Hi there! Welcome to Ringy, your AI personal assistant. I don't recognize your number yet. What's your name? I'd love to know what to call you.";
      state = 'onboarding';
    } else if (!user.onboarding_completed) {
      // Known user but not onboarded
      greeting = `Welcome back! I have your number saved, but we haven't finished setting things up. What would you like me to call you?`;
      state = 'onboarding';
    } else {
      // Check balance
      const { hasBalance, balanceCents } = await this.checkUserBalance(
        user.id,
      );

      if (!hasBalance) {
        greeting = `Hi ${user.preferred_name || user.full_name || 'there'}! I'm sorry, but you're out of credits. Please add more balance on our website to continue using the service. Have a great day!`;
        state = 'ending';
      } else {
        const displayName = user.preferred_name || user.full_name || 'there';
        greeting = `Hey ${displayName}! Great to hear from you. How can I help you today?`;
        state = 'active';
      }
    }

    // Create session
    const session = await this.callSessionService.createSession({
      callId: call.id,
      callSid,
      callerPhone,
      userId: user?.id,
      state,
    });

    if (user?.preferred_name) {
      await this.callSessionService.setPreferredName(
        callSid,
        user.preferred_name,
      );
    }

    // Generate audio
    const audioUrl = await this.elevenlabsService.generateAndUploadSpeech(
      greeting,
      call.id,
      0,
    );

    // Store greeting as system message
    await this.callsService.addMessage(call.id, 'assistant', greeting, audioUrl);

    return { greeting, audioUrl, session };
  }

  async handleUserInput(
    callSid: string,
    userSpeech: string,
  ): Promise<{
    response: string;
    audioUrl: string | null;
    shouldEnd: boolean;
  }> {
    const session = await this.callSessionService.getSession(callSid);
    if (!session) {
      return {
        response: "I'm sorry, there was an error. Please call back.",
        audioUrl: null,
        shouldEnd: true,
      };
    }

    // Store user message
    await this.callsService.addMessage(session.callId, 'user', userSpeech);
    const messageIndex = await this.callSessionService.incrementMessageCount(
      callSid,
    );

    let response: string;
    let shouldEnd = false;

    switch (session.state) {
      case 'onboarding':
        const onboardingResult = await this.handleOnboarding(
          session,
          userSpeech,
        );
        response = onboardingResult.response;
        break;

      case 'active':
        const activeResult = await this.handleActiveConversation(
          session,
          userSpeech,
        );
        response = activeResult.response;
        shouldEnd = activeResult.shouldEnd;
        break;

      case 'ending':
        response = 'Goodbye! Talk to you soon.';
        shouldEnd = true;
        break;

      default:
        response = "I'm not sure what happened. Let me transfer you.";
        shouldEnd = true;
    }

    // Generate audio
    const audioUrl = await this.elevenlabsService.generateAndUploadSpeech(
      response,
      session.callId,
      messageIndex,
    );

    // Store assistant response
    await this.callsService.addMessage(
      session.callId,
      'assistant',
      response,
      audioUrl,
    );

    return { response, audioUrl, shouldEnd };
  }

  private async handleOnboarding(
    session: CallSession,
    userSpeech: string,
  ): Promise<{ response: string }> {
    const supabase = this.supabaseService.getClient();

    // Extract name from speech using AI
    const extractedName = await this.extractNameFromSpeech(userSpeech);

    if (!extractedName) {
      return {
        response:
          "I didn't quite catch your name. Could you please tell me again what you'd like me to call you?",
      };
    }

    // Update or create user
    if (session.userId) {
      // Update existing user
      await supabase
        .from('profiles')
        .update({
          preferred_name: extractedName,
          onboarding_completed: true,
        })
        .eq('id', session.userId);
    } else {
      // Create new user via phone
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          preferred_name: extractedName,
          onboarding_completed: true,
        })
        .select()
        .single();

      if (newProfile) {
        // Link phone number
        await supabase.from('user_phones').insert({
          user_id: newProfile.id,
          phone_number: session.callerPhone,
          is_verified: true,
          is_primary: true,
        });

        // Update session with user ID
        await this.callSessionService.setUserId(session.callSid, newProfile.id);
      }
    }

    // Update session
    await this.callSessionService.setPreferredName(session.callSid, extractedName);
    await this.callSessionService.setState(session.callSid, 'active');

    return {
      response: `Great to meet you, ${extractedName}! I'm your AI personal assistant. I can help you with reminders, answer questions, or just chat. What would you like to talk about?`,
    };
  }

  private async handleActiveConversation(
    session: CallSession,
    userSpeech: string,
  ): Promise<{ response: string; shouldEnd: boolean }> {
    // Check for goodbye intent
    const lowerSpeech = userSpeech.toLowerCase();
    if (
      lowerSpeech.includes('goodbye') ||
      lowerSpeech.includes('bye') ||
      lowerSpeech.includes('hang up') ||
      lowerSpeech.includes('end call')
    ) {
      await this.callSessionService.setState(session.callSid, 'ending');
      return {
        response: `Goodbye${session.preferredName ? `, ${session.preferredName}` : ''}! It was great talking with you. Talk soon!`,
        shouldEnd: true,
      };
    }

    // Get conversation history
    const messages = await this.callsService.getMessages(session.callId);
    const conversationHistory: ConversationMessage[] = messages
      .slice(-10) // Last 10 messages for context
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // Get relevant memories
    let memories: UserMemory[] = [];
    if (session.userId) {
      memories = await this.searchRelevantMemories(
        session.userId,
        userSpeech,
        5,
      );
    }

    // Build system prompt
    const systemPrompt = this.openaiService.buildSystemPrompt(
      session.preferredName || 'friend',
      memories.map((m) => ({ content: m.content, category: m.category })),
    );

    // Add current user message
    conversationHistory.push({ role: 'user', content: userSpeech });

    // Get AI response
    const aiResponse = await this.openaiService.chat(conversationHistory, {
      systemPrompt,
      maxTokens: 300, // Keep responses concise for phone
      temperature: 0.7,
    });

    return {
      response:
        aiResponse || "I'm sorry, I didn't quite understand. Could you repeat that?",
      shouldEnd: false,
    };
  }

  private async extractNameFromSpeech(speech: string): Promise<string | null> {
    const prompt = `Extract the person's name from this speech. If they say something like "My name is John" or "Call me Sarah" or "I'm Mike", extract just the name. If no clear name is given, respond with "NONE".

Speech: "${speech}"

Respond with just the name or "NONE".`;

    const response = await this.openaiService.chat(
      [{ role: 'user', content: prompt }],
      { maxTokens: 50, temperature: 0 },
    );

    if (!response || response.toUpperCase().includes('NONE')) {
      return null;
    }

    // Clean up the response
    return response.trim().replace(/['"]/g, '');
  }

  async handleCallEnd(callSid: string): Promise<void> {
    const session = await this.callSessionService.getSession(callSid);
    if (!session) {
      return;
    }

    // Clean up session
    await this.callSessionService.deleteSession(callSid);

    // Charge for the call
    await this.callsService.chargeForCall(session.callId);

    // Queue memory extraction job (only if user is identified)
    if (session.userId) {
      await this.queueService.addJob('extract-memories', {
        callId: session.callId,
        userId: session.userId,
      });
      this.logger.log(`Queued memory extraction for call ${session.callId}`);
    }

    this.logger.log(`Call ${callSid} ended and cleaned up`);
  }
}
