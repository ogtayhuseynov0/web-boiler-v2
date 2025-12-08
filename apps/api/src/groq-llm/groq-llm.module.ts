import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroqLlmController } from './groq-llm.controller';
import { GroqLlmService } from './groq-llm.service';
import { MemoirModule } from '../memoir/memoir.module';

@Module({
  imports: [ConfigModule, MemoirModule],
  controllers: [GroqLlmController],
  providers: [GroqLlmService],
  exports: [GroqLlmService],
})
export class GroqLlmModule {}
