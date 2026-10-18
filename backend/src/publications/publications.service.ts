import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../common/queues/queue.service';

// Canais com integração oficial implementada no backend.
// Canais fora desta lista são rejeitados aqui — nunca reportamos "publicado"
// sem ter efetivamente publicado.
const SUPPORTED_CHANNELS = ['facebook'];

@Injectable()
export class PublicationsService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
  ) {}

  async publish(tenantId: string, campaignId: string, channel: string, destination?: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new BadRequestException('Campanha não encontrada');
    }

    const channels = campaign.selectedChannels as string[];
    if (!channels.includes(channel)) {
      throw new BadRequestException(`Canal ${channel} não está selecionado nesta campanha`);
    }

    if (!SUPPORTED_CHANNELS.includes(channel)) {
      throw new BadRequestException(
        `O canal ${channel} ainda não possui integração oficial. ` +
          `Disponível hoje: ${SUPPORTED_CHANNELS.join(', ')}. ` +
          `Para os demais canais, use o modo assistido (copiar e colar).`,
      );
    }

    if (channel === 'facebook') {
      const integration = await this.prisma.integration.findFirst({
        where: { tenantId, channel: 'facebook', status: 'active' },
      });

      if (!integration) {
        throw new BadRequestException(
          'Conecte sua página do Facebook em Integrações antes de publicar.',
        );
      }
    }

    const publication = await this.prisma.publication.create({
      data: {
        tenantId,
        campaignId,
        channel,
        destination: destination || null,
        status: 'pending',
      },
    });

    // Enfileirar publicação assíncrona
    let job;
    try {
      job = await this.queueService.enqueuePublication({
        tenantId,
        publicationId: publication.id,
        channel,
        campaignId,
      });
    } catch (error) {
      await this.prisma.publication.update({
        where: { id: publication.id },
        data: { status: 'failed', result: { error: error.message } },
      });
      throw error;
    }

    return {
      id: publication.id,
      jobId: job.id,
      status: 'pending',
      message: `Publicação no ${channel} enfileirada`,
    };
  }

  async findAll(tenantId: string) {
    return this.prisma.publication.findMany({
      where: { tenantId },
      include: {
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string) {
    return this.prisma.publication.findFirst({
      where: { id, tenantId },
      include: {
        campaign: { select: { id: true, name: true } },
      },
    });
  }

  async getAssistedContent(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
      include: {
        product: true,
      },
    });

    if (!campaign) {
      throw new BadRequestException('Campanha não encontrada');
    }

    const product = campaign.product;

    return {
      campaignId: campaign.id,
      productName: product.name,
      price: product.price,
      suggestedText: `🔥 ${product.name} por apenas R$ ${product.price}! Aproveite essa oferta imperdível! 🛒`,
      hashtags: '#oferta #promocao #compraragora',
      images: product.originalImages,
    };
  }
}
