import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { GuestChatService } from './guest-chat.service';
import { MemoirModule } from '../memoir/memoir.module';
import { OpenAIModule } from '../openai/openai.module';

@Module({
  imports: [MemoirModule, OpenAIModule],
  controllers: [InvitesController],
  providers: [InvitesService, GuestChatService],
  exports: [InvitesService, GuestChatService],
})
export class InvitesModule {}
