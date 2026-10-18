import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';

// Limites por plano
const PLAN_LIMITS: Record<string, { aiPerMinute: number; publishPerHour: number }> = {
  starter: { aiPerMinute: 5, publishPerHour: 10 },
  pro: { aiPerMinute: 20, publishPerHour: 50 },
  agency: { aiPerMinute: 100, publishPerHour: 500 },
};

export interface JobPayload {
  tenantId: string;
  [key: string]: any;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('ai-image-generation') private imageQueue: Queue,
    @InjectQueue('ai-video-generation') private videoQueue: Queue,
    @InjectQueue('social-publish') private publishQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async enqueueImageGeneration(payload: JobPayload): Promise<Job> {
    await this.checkRateLimit(payload.tenantId, 'ai');

    const job = await this.imageQueue.add('generate-image', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(`Job de imagem enfileirado: ${job.id} (tenant: ${payload.tenantId})`);
    return job;
  }

  async enqueueVideoGeneration(payload: JobPayload): Promise<Job> {
    await this.checkRateLimit(payload.tenantId, 'ai');

    const job = await this.videoQueue.add('generate-video', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: 50,
      removeOnFail: 25,
    });

    this.logger.log(`Job de vídeo enfileirado: ${job.id} (tenant: ${payload.tenantId})`);
    return job;
  }

  async enqueuePublication(payload: JobPayload): Promise<Job> {
    await this.checkRateLimit(payload.tenantId, 'publish');

    const job = await this.publishQueue.add('publish-content', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 100,
    });

    this.logger.log(`Job de publicação enfileirado: ${job.id} (tenant: ${payload.tenantId})`);
    return job;
  }

  async getJobStatus(
    jobId: string,
    queueName: string,
    tenantId?: string,
  ): Promise<{ status: string; data?: any; error?: string }> {
    let queue: Queue;
    switch (queueName) {
      case 'ai-image-generation': queue = this.imageQueue; break;
      case 'ai-video-generation': queue = this.videoQueue; break;
      case 'social-publish': queue = this.publishQueue; break;
      default: throw new Error(`Queue desconhecida: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) return { status: 'not_found' };

    // Isolamento multi-tenant: um job só pode ser inspecionado pelo próprio tenant
    if (tenantId && job.data?.tenantId !== tenantId) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    return {
      status: state,
      data: job.data,
      error: job.failedReason || undefined,
    };
  }

  private async checkRateLimit(tenantId: string, type: 'ai' | 'publish') {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const limits = PLAN_LIMITS[tenant?.plan || 'starter'];

    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 1000); // 1 minuto

    const windowStartHour = new Date(now.getTime() - 60 * 60 * 1000); // 1 hora

    if (type === 'ai') {
      const recentJobs = await this.prisma.aIGeneration.count({
        where: {
          tenantId,
          createdAt: { gte: windowStart },
        },
      });

      if (recentJobs >= limits.aiPerMinute) {
        this.logger.warn(
          `Rate limit de IA atingido para tenant ${tenantId}: ${recentJobs}/${limits.aiPerMinute} por minuto`,
        );
        throw new Error(`Rate limit: máximo ${limits.aiPerMinute} gerações de IA por minuto no plano ${tenant?.plan}`);
      }
    } else {
      const recentPubs = await this.prisma.publication.count({
        where: {
          tenantId,
          createdAt: { gte: windowStartHour },
        },
      });

      if (recentPubs >= limits.publishPerHour) {
        this.logger.warn(
          `Rate limit de publicação atingido para tenant ${tenantId}: ${recentPubs}/${limits.publishPerHour} por hora`,
        );
        throw new Error(`Rate limit: máximo ${limits.publishPerHour} publicações por hora no plano ${tenant?.plan}`);
      }
    }
  }

  async getQueueStats() {
    const [imageWaiting, imageActive, imageCompleted, imageFailed] = await Promise.all([
      this.imageQueue.getWaitingCount(),
      this.imageQueue.getActiveCount(),
      this.imageQueue.getCompletedCount(),
      this.imageQueue.getFailedCount(),
    ]);

    const [videoWaiting, videoActive, videoCompleted, videoFailed] = await Promise.all([
      this.videoQueue.getWaitingCount(),
      this.videoQueue.getActiveCount(),
      this.videoQueue.getCompletedCount(),
      this.videoQueue.getFailedCount(),
    ]);

    const [pubWaiting, pubActive, pubCompleted, pubFailed] = await Promise.all([
      this.publishQueue.getWaitingCount(),
      this.publishQueue.getActiveCount(),
      this.publishQueue.getCompletedCount(),
      this.publishQueue.getFailedCount(),
    ]);

    return {
      'ai-image-generation': { waiting: imageWaiting, active: imageActive, completed: imageCompleted, failed: imageFailed },
      'ai-video-generation': { waiting: videoWaiting, active: videoActive, completed: videoCompleted, failed: videoFailed },
      'social-publish': { waiting: pubWaiting, active: pubActive, completed: pubCompleted, failed: pubFailed },
    };
  }
}
