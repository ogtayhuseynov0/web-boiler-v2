import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export interface CallSession {
  callId: string;
  callSid: string;
  userId: string | null;
  state: 'identifying' | 'onboarding' | 'active' | 'ending';
  callerPhone: string;
  preferredName: string | null;
  messageCount: number;
  context: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class CallSessionService implements OnModuleInit {
  private readonly logger = new Logger(CallSessionService.name);
  private redis: Redis;
  private readonly sessionPrefix = 'call_session:';
  private readonly sessionTTL = 3600; // 1 hour

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisConfig = {
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
    };

    this.redis = new Redis(redisConfig);
    this.logger.log('CallSessionService Redis connected');
  }

  private getKey(callSid: string): string {
    return `${this.sessionPrefix}${callSid}`;
  }

  async createSession(data: {
    callId: string;
    callSid: string;
    callerPhone: string;
    userId?: string;
    state?: CallSession['state'];
  }): Promise<CallSession> {
    const session: CallSession = {
      callId: data.callId,
      callSid: data.callSid,
      userId: data.userId || null,
      state: data.state || 'identifying',
      callerPhone: data.callerPhone,
      preferredName: null,
      messageCount: 0,
      context: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.redis.setex(
      this.getKey(data.callSid),
      this.sessionTTL,
      JSON.stringify(session),
    );

    this.logger.log(`Created session for call ${data.callSid}`);
    return session;
  }

  async getSession(callSid: string): Promise<CallSession | null> {
    const data = await this.redis.get(this.getKey(callSid));
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as CallSession;
    } catch {
      return null;
    }
  }

  async updateSession(
    callSid: string,
    updates: Partial<Omit<CallSession, 'callSid' | 'createdAt'>>,
  ): Promise<CallSession | null> {
    const session = await this.getSession(callSid);
    if (!session) {
      return null;
    }

    const updatedSession: CallSession = {
      ...session,
      ...updates,
      updatedAt: Date.now(),
    };

    await this.redis.setex(
      this.getKey(callSid),
      this.sessionTTL,
      JSON.stringify(updatedSession),
    );

    return updatedSession;
  }

  async setState(
    callSid: string,
    state: CallSession['state'],
  ): Promise<CallSession | null> {
    return this.updateSession(callSid, { state });
  }

  async setUserId(
    callSid: string,
    userId: string,
  ): Promise<CallSession | null> {
    return this.updateSession(callSid, { userId });
  }

  async setPreferredName(
    callSid: string,
    name: string,
  ): Promise<CallSession | null> {
    return this.updateSession(callSid, { preferredName: name });
  }

  async incrementMessageCount(callSid: string): Promise<number> {
    const session = await this.getSession(callSid);
    if (!session) {
      return 0;
    }

    const newCount = session.messageCount + 1;
    await this.updateSession(callSid, { messageCount: newCount });
    return newCount;
  }

  async setContext(
    callSid: string,
    key: string,
    value: unknown,
  ): Promise<CallSession | null> {
    const session = await this.getSession(callSid);
    if (!session) {
      return null;
    }

    return this.updateSession(callSid, {
      context: { ...session.context, [key]: value },
    });
  }

  async getContext<T>(callSid: string, key: string): Promise<T | null> {
    const session = await this.getSession(callSid);
    if (!session) {
      return null;
    }

    return (session.context[key] as T) || null;
  }

  async deleteSession(callSid: string): Promise<void> {
    await this.redis.del(this.getKey(callSid));
    this.logger.log(`Deleted session for call ${callSid}`);
  }

  async extendSession(callSid: string): Promise<void> {
    await this.redis.expire(this.getKey(callSid), this.sessionTTL);
  }
}
