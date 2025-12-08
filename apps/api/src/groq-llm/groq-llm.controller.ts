import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { GroqLlmService } from './groq-llm.service';
import type { ChatCompletionRequest } from './groq-llm.service';

@ApiTags('llm')
@Controller('v1/chat')
export class GroqLlmController {
  private readonly logger = new Logger(GroqLlmController.name);

  constructor(private readonly groqLlmService: GroqLlmService) {}

  private extractLastUserMessage(
    messages: Array<{ role: string; content?: any }>,
  ): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content) {
        const content = messages[i].content;
        return typeof content === 'string' ? content : JSON.stringify(content);
      }
    }
    return '';
  }

  @Post('completions')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async createChatCompletion(
    @Body() request: ChatCompletionRequest,
    @Res() res: Response,
  ) {
    const requestReceivedAt = performance.now();
    this.logger.log(
      `[PERF] Request received | stream: ${request.stream} | messages: ${request.messages?.length || 0}`,
    );

    if (!this.groqLlmService.isConfigured()) {
      throw new HttpException(
        'LLM service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      // Handle streaming response
      if (request.stream !== false) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Extract user_id for story context
        const userId = request.user_id;

        // Fetch stories for context
        let stories: Awaited<
          ReturnType<typeof this.groqLlmService.getStoriesForContext>
        > = [];

        if (userId) {
          this.logger.log(
            `[PERF] Fetching stories for context for user ${userId}`,
          );
          stories = await this.groqLlmService.getStoriesForContext(userId);
        }

        // Get the LLM response with stories injected
        const { stream, requestStartTime } =
          await this.groqLlmService.createChatCompletionStreamWithStories(
            request,
            stories,
          );

        let firstChunkReceived = false;
        let chunkCount = 0;

        for await (const chunk of stream) {
          if (!firstChunkReceived) {
            const ttfb = performance.now() - requestStartTime;
            this.logger.log(
              `[PERF] Time to first byte (TTFB): ${ttfb.toFixed(2)}ms | stories: ${stories.length}`,
            );
            firstChunkReceived = true;
          }

          chunkCount++;
          const data = JSON.stringify(chunk);
          res.write(`data: ${data}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();

        const totalDuration = performance.now() - requestReceivedAt;
        this.logger.log(
          `[PERF] Stream complete | chunks: ${chunkCount} | stories: ${stories.length} | total: ${totalDuration.toFixed(2)}ms`,
        );
      } else {
        // Handle non-streaming response
        const completion =
          await this.groqLlmService.createChatCompletion(request);

        const totalDuration = performance.now() - requestReceivedAt;
        this.logger.log(
          `[PERF] Non-stream complete | total: ${totalDuration.toFixed(2)}ms`,
        );

        res.json(completion);
      }
    } catch (error) {
      const errorDuration = performance.now() - requestReceivedAt;
      this.logger.error(
        `[PERF] Error after ${errorDuration.toFixed(2)}ms: ${error.message}`,
        error.stack,
      );

      // If headers already sent (streaming started), we can't change status
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        throw new HttpException(
          error.message || 'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
