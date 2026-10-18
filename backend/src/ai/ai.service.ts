import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { QueueService } from '../common/queues/queue.service';

@Injectable()
export class AIService {
  constructor(
    private prisma: PrismaService,
    private creditsService: CreditsService,
    private queueService: QueueService,
  ) {}

  async generateImage(tenantId: string, productId: string) {
    const balance = await this.creditsService.getBalance(tenantId);
    if (balance <= 0) {
      throw new BadRequestException('Créditos insuficientes para geração');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        OR: [
          { tenantId },
          { supplierCatalog: { type: 'partner_global' } },
        ],
      },
    });

    if (!product) {
      throw new BadRequestException('Produto não encontrado');
    }

    const generation = await this.prisma.aIGeneration.create({
      data: {
        tenantId,
        productId,
        type: 'image',
        promptUsed: `Ad image for ${product.name} - price ${product.price}`,
        status: 'pending',
        creditsCost: 1,
      },
    });

    // Enfileirar job assíncrono (o rate limit é validado aqui). O débito só
    // acontece depois: assim um enqueue recusado não queima crédito do tenant.
    let job;
    try {
      job = await this.queueService.enqueueImageGeneration({
        tenantId,
        generationId: generation.id,
        productId,
      });
    } catch (error) {
      await this.prisma.aIGeneration.update({
        where: { id: generation.id },
        data: { status: 'failed', metadata: { error: error.message } },
      });
      throw error;
    }

    await this.creditsService.debit(tenantId, 1, `Geração de imagem: ${generation.id}`);

    return {
      id: generation.id,
      jobId: job.id,
      status: 'pending',
      message: 'Geração de imagem enfileirada',
    };
  }

  async generateVideo(tenantId: string, productId: string) {
    const balance = await this.creditsService.getBalance(tenantId);
    if (balance <= 3) {
      throw new BadRequestException('Créditos insuficientes para geração de vídeo (mínimo: 3)');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        OR: [
          { tenantId },
          { supplierCatalog: { type: 'partner_global' } },
        ],
      },
    });

    if (!product) {
      throw new BadRequestException('Produto não encontrado');
    }

    const generation = await this.prisma.aIGeneration.create({
      data: {
        tenantId,
        productId,
        type: 'video',
        promptUsed: `Short video ad (9:16) for ${product.name}`,
        status: 'pending',
        creditsCost: 3,
      },
    });

    // Enfileirar antes de debitar: um enqueue recusado (rate limit) não pode
    // queimar crédito. A falha em runtime é estornada pelo worker.
    let job;
    try {
      job = await this.queueService.enqueueVideoGeneration({
        tenantId,
        generationId: generation.id,
        productId,
      });
    } catch (error) {
      await this.prisma.aIGeneration.update({
        where: { id: generation.id },
        data: { status: 'failed', metadata: { error: error.message } },
      });
      throw error;
    }

    await this.creditsService.debit(tenantId, 3, `Geração de vídeo: ${generation.id}`);

    return {
      id: generation.id,
      jobId: job.id,
      status: 'pending',
      message: 'Geração de vídeo enfileirada (pode levar alguns minutos)',
    };
  }

  async getStatus(generationId: string, tenantId: string) {
    return this.prisma.aIGeneration.findFirst({
      where: { id: generationId, tenantId },
    });
  }

  async findByProduct(productId: string, tenantId: string) {
    return this.prisma.aIGeneration.findMany({
      where: { productId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
