import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import type { User } from '@supabase/supabase-js';

@Controller('chat')
@UseGuards(SupabaseAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('session')
  async createOrGetSession(@CurrentUser() user: User) {
    try {
      const session = await this.chatService.getOrCreateSession(user.id);
      return { session };
    } catch (error) {
      throw new HttpException(
        'Failed to create session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('message')
  async sendMessage(
    @CurrentUser() user: User,
    @Body() body: { session_id: string; content: string },
  ) {
    if (!body.content?.trim()) {
      throw new HttpException('Message content is required', HttpStatus.BAD_REQUEST);
    }

    try {
      // Get or create session if not provided
      let sessionId = body.session_id;
      if (!sessionId) {
        const session = await this.chatService.getOrCreateSession(user.id);
        sessionId = session.id;
      }

      const result = await this.chatService.sendMessage(
        user.id,
        sessionId,
        body.content.trim(),
      );

      return {
        response: result.response,
        message_id: result.messageId,
        session_id: sessionId,
      };
    } catch (error) {
      throw new HttpException(
        (error as Error).message || 'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('session/:id/messages')
  async getSessionMessages(
    @CurrentUser() user: User,
    @Param('id') sessionId: string,
  ) {
    const messages = await this.chatService.getSessionMessages(
      user.id,
      sessionId,
    );
    return { messages };
  }

  @Get('session/active')
  async getActiveSession(@CurrentUser() user: User) {
    const session = await this.chatService.getActiveSession(user.id);
    if (!session) {
      return { session: null, messages: [] };
    }

    const messages = await this.chatService.getSessionMessages(
      user.id,
      session.id,
    );

    return { session, messages };
  }

  @Post('session/:id/end')
  async endSession(
    @CurrentUser() user: User,
    @Param('id') sessionId: string,
  ) {
    const success = await this.chatService.endSession(user.id, sessionId);
    return { success };
  }

  @Get('sessions')
  async getUserSessions(@CurrentUser() user: User) {
    const result = await this.chatService.getUserSessions(user.id);
    return result;
  }
}
