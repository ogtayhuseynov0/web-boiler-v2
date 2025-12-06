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

  @Post('completions')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async createChatCompletion(
    @Body() request: ChatCompletionRequest,
    @Res() res: Response,
  ) {
    this.logger.log(
      `Received chat completion request, stream: ${request.stream}`,
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

        const stream =
          await this.groqLlmService.createChatCompletionStream(request);

        for await (const chunk of stream) {
          const data = JSON.stringify(chunk);
          res.write(`data: ${data}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // Handle non-streaming response
        const completion =
          await this.groqLlmService.createChatCompletion(request);
        res.json(completion);
      }
    } catch (error) {
      this.logger.error(`Chat completion error: ${error.message}`, error.stack);

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
