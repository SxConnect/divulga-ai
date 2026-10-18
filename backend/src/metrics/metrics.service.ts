import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const [
      totalProducts,
      totalCampaigns,
      totalPublications,
      totalGenerations,
      creditsUsed,
    ] = await Promise.all([
      this.prisma.product.count({
        where: { OR: [{ tenantId }, { supplierCatalog: { type: 'partner_global' } }] },
      }),
      this.prisma.campaign.count({ where: { tenantId } }),
      this.prisma.publication.count({ where: { tenantId } }),
      this.prisma.aIGeneration.count({ where: { tenantId } }),
      this.prisma.creditLedger.aggregate({
        where: { tenantId, type: 'consumption' },
        _sum: { quantity: true },
      }),
    ]);

    const recentPublications = await this.prisma.publication.findMany({
      where: { tenantId },
      include: {
        campaign: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const channelStats = await this.prisma.publication.groupBy({
      by: ['channel'],
      where: { tenantId },
      _count: true,
    });

    return {
      summary: {
        totalProducts,
        totalCampaigns,
        totalPublications,
        totalGenerations,
        creditsUsed: Math.abs(creditsUsed._sum.quantity || 0),
      },
      recentPublications,
      channelStats,
    };
  }

  async getChannelMetrics(tenantId: string, channel?: string) {
    const where = {
      tenantId,
      ...(channel ? { channel } : {}),
    };

    const publications = await this.prisma.publication.findMany({
      where,
      select: {
        id: true,
        channel: true,
        destination: true,
        externalPostId: true,
        result: true,
        publishedAt: true,
        status: true,
      },
      orderBy: { publishedAt: 'desc' },
    });

    return publications;
  }
}
