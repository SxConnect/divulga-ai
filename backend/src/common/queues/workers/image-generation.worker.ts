import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderFactory } from '../../../ai/providers/provider.factory';
import { CreditsService } from '../../../credits/credits.service';

@Processor('ai-image-generation')
export class ImageGenerationWorker {
  private readonly logger = new Logger(ImageGenerationWorker.name);

  constructor(
    private prisma: PrismaService,
    private providerFactory: ProviderFactory,
    private creditsService: CreditsService,
  ) {}

  @Process('generate-image')
  async handleGenerateImage(job: Job) {
    const { tenantId, generationId, productId } = job.data;

    this.logger.log(`Processando geração de imagem: job=${job.id}, tenant=${tenantId}`);

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

      const provider = this.providerFactory.getImageProvider();
      const result = await provider.generate({
        productName: product.name,
        price: Number(product.price),
        originalImageUrls: product.originalImages as string[],
        tenantId,
        productId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Falha na geração de imagem');
      }

      await this.prisma.aIGeneration.update({
        where: { id: generationId },
        data: {
          status: 'completed',
          generatedUrl: result.imageUrl,
        },
      });

      this.logger.log(`Imagem gerada com sucesso: ${generationId}`);
      return { success: true, url: result.imageUrl };
    } catch (error) {
      await this.prisma.aIGeneration.update({
        where: { id: generationId },
        data: { status: 'failed' },
      });

      this.logger.error(`Falha ao gerar imagem: ${error.message}`);
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Job de imagem falhou definitivamente: ${job.id} - ${error.message}`);

    const { tenantId, generationId } = job.data;

    // Estorno: a falha definitiva não pode queimar crédito do tenant.
    // Só na última tentativa (o evento de falha é disparado por tentativa)
    // e de forma idempotente.
    const generation = await this.prisma.aIGeneration.findUnique({
      where: { id: generationId },
    });

    let refunded = false;
    if (generation) {
      refunded = await this.creditsService.refundOnce(
        tenantId,
        generation.creditsCost,
        `Estorno geração de imagem ${generationId}`,
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
        action: 'generation_failed',
        entity: 'ai_generation',
        entityId: generationId,
        details: { error: error.message, jobId: job.id, attempt: job.attemptsMade, refunded },
      },
    });
  }

  @OnQueueCompleted()
  async onCompleted(job: Job) {
    this.logger.log(`Job de imagem completado: ${job.id}`);
  }
}
