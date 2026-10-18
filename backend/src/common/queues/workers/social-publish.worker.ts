import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { FacebookAuthService } from '../../../integrations/facebook/facebook-auth.service';
import { IntegrationsService } from '../../../integrations/integrations.service';

@Processor('social-publish')
export class SocialPublishWorker {
  private readonly logger = new Logger(SocialPublishWorker.name);

  constructor(
    private prisma: PrismaService,
    private facebookAuth: FacebookAuthService,
    private integrationsService: IntegrationsService,
  ) {}

  @Process('publish-content')
  async handlePublish(job: Job) {
    const { tenantId, publicationId, channel, campaignId } = job.data;

    this.logger.log(`Processando publicação: job=${job.id}, canal=${channel}, tenant=${tenantId}`);

    // Idempotência: se uma tentativa anterior já publicou, não republicamos
    // (evita posts duplicados quando o job falha após a publicação externa).
    const existing = await this.prisma.publication.findUnique({
      where: { id: publicationId },
    });

    if (existing?.status === 'published' && existing.externalPostId) {
      this.logger.warn(`Publicação ${publicationId} já estava publicada; ignorando retry.`);
      return { success: true, externalPostId: existing.externalPostId };
    }

    await this.prisma.publication.update({
      where: { id: publicationId },
      data: { status: 'processing' },
    });

    let externalPostId: string | undefined;

    try {
      switch (channel) {
        case 'facebook':
          externalPostId = await this.publishToFacebook(tenantId, campaignId);
          break;
        case 'instagram':
        case 'tiktok':
        case 'whatsapp':
          // Nunca reportamos "published" sem ter publicado de verdade: o canal
          // ainda não tem integração oficial implementada.
          throw new Error(
            `O canal ${channel} ainda não possui integração oficial implementada. ` +
              `Use o canal Facebook ou o modo assistido (cópia e cola manual).`,
          );
        default:
          throw new Error(`Canal não suportado: ${channel}`);
      }

      await this.prisma.publication.update({
        where: { id: publicationId },
        data: {
          status: 'published',
          externalPostId,
          publishedAt: new Date(),
          result: {
            channel,
            publishedAt: new Date().toISOString(),
          },
        },
      });

      // Log em audit_logs (ação do sistema → userId nulo)
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: null,
          action: 'publication_success',
          entity: 'publication',
          entityId: publicationId,
          details: { channel, externalPostId },
        },
      });

      this.logger.log(`Publicação concluída: ${publicationId} → ${externalPostId}`);
      return { success: true, externalPostId };
    } catch (error) {
      // Se o post já saiu no canal externo, não o marcamos como falho (evita
      // republicar no retry). O guard de idempotência no início do handler
      // identifica esse estado e encerra o job com sucesso.
      if (externalPostId) {
        await this.prisma.publication.update({
          where: { id: publicationId },
          data: {
            status: 'published',
            externalPostId,
            publishedAt: new Date(),
            result: { channel, warning: error.message },
          },
        });
        this.logger.warn(
          `Publicação ${publicationId} efetivada, mas houve erro no pós-processamento: ${error.message}`,
        );
        throw error;
      }

      await this.prisma.publication.update({
        where: { id: publicationId },
        data: {
          status: 'failed',
          result: { channel, error: error.message },
        },
      });

      this.logger.error(`Falha na publicação: ${error.message}`);
      throw error;
    }
  }

  private async publishToFacebook(tenantId: string, campaignId: string): Promise<string> {
    // Buscar credenciais criptografadas
    const credentials = await this.integrationsService.getDecryptedCredentials(tenantId, 'facebook');

    if (!credentials) {
      throw new Error('Integração Facebook não configurada');
    }

    const parsed = JSON.parse(credentials);

    // Buscar campanha e produto
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { product: true },
    });

    if (!campaign) {
      throw new Error(`Campanha não encontrada: ${campaignId}`);
    }

    const product = campaign.product;

    // Montar mensagem do post
    const message = `🔥 ${product.name} por apenas R$ ${product.price}! Aproveite essa oferta imperdível! 🛒`;

    // Publicar na página
    const firstImage = (product.originalImages as string[])[0];
    const result = await this.facebookAuth.publishToPage(
      parsed.pageId,
      parsed.pageAccessToken,
      message,
      firstImage,
    );

    return result.postId;
  }

  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(`Job de publicação falhou definitivamente: ${job.id} - ${error.message}`);

    const { tenantId, publicationId } = job.data;
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: null,
        action: 'publication_failed',
        entity: 'publication',
        entityId: publicationId,
        details: { error: error.message, jobId: job.id },
      },
    });
  }
}
