import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(@InjectQueue('jobs') private jobsQueue: Queue) {}

  /**
   * Add a job to the queue
   */
  async addJob<T>(
    name: string,
    data: T,
    options?: {
      delay?: number;
      jobId?: string;
      attempts?: number;
    },
  ): Promise<string> {
    const job = await this.jobsQueue.add(name, data, {
      delay: options?.delay,
      jobId: options?.jobId,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: options?.attempts ?? 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    this.logger.log(`Added job ${name} with id ${job.id}`);
    return job.id!;
  }

  /**
   * Cancel a job by id
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.jobsQueue.getJob(jobId);

    if (job) {
      await job.remove();
      this.logger.log(`Cancelled job ${jobId}`);
      return true;
    }

    return false;
  }

  /**
   * Add a debounced job - cancels any existing job with the same ID and schedules a new one
   * Useful for operations that should only run after a period of inactivity
   */
  async addDebouncedJob<T>(
    name: string,
    data: T,
    options: {
      jobId: string;
      delayMs: number;
      attempts?: number;
    },
  ): Promise<string> {
    // Cancel existing job if it exists
    await this.cancelJob(options.jobId);

    // Add new delayed job
    const job = await this.jobsQueue.add(name, data, {
      jobId: options.jobId,
      delay: options.delayMs,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: options.attempts ?? 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    this.logger.log(
      `Scheduled debounced job ${name} (id: ${job.id}) to run in ${options.delayMs}ms`,
    );
    return job.id!;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.jobsQueue.getWaitingCount(),
      this.jobsQueue.getActiveCount(),
      this.jobsQueue.getCompletedCount(),
      this.jobsQueue.getFailedCount(),
      this.jobsQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}
