import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroqLlmController } from './groq-llm.controller';
import { GroqLlmService } from './groq-llm.service';
import { MemoriesModule } from '../memories/memories.module';

@Module({
  imports: [ConfigModule, MemoriesModule],
  controllers: [GroqLlmController],
  providers: [GroqLlmService],
  exports: [GroqLlmService],
})
export class GroqLlmModule {}
