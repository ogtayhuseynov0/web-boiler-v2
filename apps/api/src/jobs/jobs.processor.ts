import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MemoriesService } from '../memories/memories.service';
import { CallsService } from '../calls/calls.service';

export interface ExtractMemoriesJobData {
  callId: string;
  userId: string;
}

export interface CalculateCallCostJobData {
  callId: string;
  durationSeconds: number;
}

@Processor('jobs')
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    private memoriesService: MemoriesService,
    private callsService: CallsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.name} (${job.id})`);

    switch (job.name) {
      case 'extract-memories':
        await this.processExtractMemories(job.data as ExtractMemoriesJobData);
        break;

      case 'calculate-call-cost':
        await this.processCalculateCallCost(
          job.data as CalculateCallCostJobData,
        );
        break;

      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async processExtractMemories(
    data: ExtractMemoriesJobData,
  ): Promise<void> {
    const { callId, userId } = data;

    this.logger.log(`Extracting memories from call ${callId}`);

    try {
      // Get conversation messages
      const messages = await this.callsService.getMessages(callId);

      if (messages.length < 2) {
        this.logger.log(`Call ${callId} has insufficient messages for memory extraction`);
        return;
      }

      // Filter to only user and assistant messages
      const conversationMessages = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Extract and save memories
      const extractedMemories =
        await this.memoriesService.extractAndSaveMemories(
          userId,
          callId,
          conversationMessages,
        );

      this.logger.log(
        `Extracted ${extractedMemories.length} memories from call ${callId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to extract memories from call ${callId}:`,
        error,
      );
      throw error; // Re-throw to trigger retry
    }
  }

  private async processCalculateCallCost(
    data: CalculateCallCostJobData,
  ): Promise<void> {
    const { callId } = data;

    this.logger.log(`Calculating cost for call ${callId}`);

    try {
      await this.callsService.chargeForCall(callId);
      this.logger.log(`Successfully charged for call ${callId}`);
    } catch (error) {
      this.logger.error(`Failed to charge for call ${callId}:`, error);
      throw error;
    }
  }
}
