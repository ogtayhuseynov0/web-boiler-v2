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

    this.logger.warn(`Job ${jobId} not found in queue`);
    return false;
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
