import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { CallsService } from '../calls/calls.service';
import { MemoirService } from '../memoir/memoir.service';
import { ProfileService } from '../profile/profile.service';
import { SupabaseService } from '../supabase/supabase.service';

export interface ExtractStoriesJobData {
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
    private callsService: CallsService,
    @Inject(forwardRef(() => MemoirService))
    private memoirService: MemoirService,
    private profileService: ProfileService,
    private supabaseService: SupabaseService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.name} (${job.id})`);

    switch (job.name) {
      case 'extract-stories':
        await this.processExtractStories(job.data as ExtractStoriesJobData);
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

  private async processExtractStories(
    data: ExtractStoriesJobData,
  ): Promise<void> {
    const { callId, userId } = data;
    const supabase = this.supabaseService.getClient();

    this.logger.log(`Extracting stories from call ${callId}`);

    try {
      // Get conversation messages
      const messages = await this.callsService.getMessages(callId);
      const currentMessageCount = messages.length;

      this.logger.log(`Call ${callId} has ${currentMessageCount} messages`);

      if (currentMessageCount < 2) {
        this.logger.log(`Call ${callId} has insufficient messages for story extraction`);
        return;
      }

      // Check if we've already extracted for this message count (idempotency)
      const { data: call } = await supabase
        .from('calls')
        .select('last_extracted_message_count')
        .eq('id', callId)
        .single();

      const lastExtractedCount = call?.last_extracted_message_count || 0;

      if (currentMessageCount <= lastExtractedCount) {
        this.logger.log(
          `Call ${callId}: No new messages since last extraction (${currentMessageCount} <= ${lastExtractedCount}), skipping`,
        );
        return;
      }

      // Filter to only user and assistant messages
      const conversationMessages = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      this.logger.log(`Filtered to ${conversationMessages.length} conversation messages`);

      // Get user's focus topics for guided extraction
      let focusTopics: string[] = [];
      try {
        focusTopics = await this.profileService.getStoryFocusTopics(userId);
        if (focusTopics.length > 0) {
          this.logger.log(`Using ${focusTopics.length} focus topics for extraction`);
        }
      } catch (err) {
        this.logger.warn(`Could not fetch focus topics: ${err}`);
      }

      // Extract and save stories
      const extractedStories =
        await this.memoirService.extractStoriesFromConversation(
          userId,
          conversationMessages,
          'chat',
          callId,
          focusTopics.length > 0 ? focusTopics : undefined,
        );

      // Update last extracted message count
      await supabase
        .from('calls')
        .update({ last_extracted_message_count: currentMessageCount })
        .eq('id', callId);

      this.logger.log(
        `Extracted ${extractedStories.length} stories from call ${callId}, updated extraction count to ${currentMessageCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to extract stories from call ${callId}:`,
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
