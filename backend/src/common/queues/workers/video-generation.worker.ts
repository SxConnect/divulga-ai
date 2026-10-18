import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderFactory } from '../../../ai/providers/provider.factory';
import { CreditsService } from '../../../credits/credits.service';

@Processor('ai-video-generation')
export class VideoGenerationWorker {
  private readonly logger = new Logger(VideoGenerationWorker.name);

  constructor(
    private prisma: PrismaService,
    private providerFactory: ProviderFactory,
    private creditsService: CreditsService,
  ) {}

  @Process('generate-video')
  async handleGenerateVideo(job: Job) {
    const { tenantId, generationId, productId } = job.data;

    this.logger.log(`Processando geração de vídeo: job=${job.id}, tenant=${tenantId}`);

    await this.prisma.aIGeneration.update({
      where: { id: generationId },
      data: { status: 'processing' },
    });

    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Produto não encontrado: ${productId}`);
      }

      const provider = this.providerFactory.getVideoProvider();
      const result = await provider.generate({
        productName: product.name,
        price: Number(product.price),
        imageUrls: product.originalImages as string[],
        duration: 15,
        tenantId,
        productId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Falha na geração de vídeo');
      }

      await this.prisma.aIGeneration.update({
        where: { id: generationId },
        data: {
          status: 'completed',
          generatedUrl: result.videoUrl,
        },
      });

      this.logger.log(`Vídeo gerado com sucesso: ${generationId}`);
      return { success: true, url: result.videoUrl };
    } catch (error) {
      await this.prisma.aIGeneration.update({
        where: { id: generationId },
        data: { status: 'failed' },
      });

      this.logger.error(`Falha ao gerar vídeo: ${error.message}`);
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Job de vídeo falhou definitivamente: ${job.id} - ${error.message}`);

    const { tenantId, generationId } = job.data;

    // Estorno idempotente na falha definitiva (o evento dispara por tentativa)
    const generation = await this.prisma.aIGeneration.findUnique({
      where: { id: generationId },
    });

    let refunded = false;
    if (generation) {
      refunded = await this.creditsService.refundOnce(
        tenantId,
        generation.creditsCost,
        `Estorno geração de vídeo ${generationId}`,
      );

      if (refunded) {
        this.logger.log(
          `Créditos estornados: ${generation.creditsCost} (tenant: ${tenantId}, geração: ${generationId})`,
        );
      }
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: null,
        action: 'video_generation_failed',
        entity: 'ai_generation',
        entityId: generationId,
        details: { error: error.message, jobId: job.id, attempt: job.attemptsMade, refunded },
      },
    });
  }
}
