import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: {
    productId: string;
    name: string;
    selectedChannels: string[];
    scheduledAt?: string;
  }) {
    // Verificar se produto existe
    const product = await this.prisma.product.findFirst({
      where: {
        id: data.productId,
        OR: [
          { tenantId },
          { supplierCatalog: { type: 'partner_global' } },
        ],
      },
    });

    if (!product) {
      throw new BadRequestException('Produto não encontrado');
    }

    return this.prisma.campaign.create({
      data: {
        tenantId,
        productId: data.productId,
        name: data.name,
        selectedChannels: data.selectedChannels,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.scheduledAt ? 'scheduled' : 'draft',
      },
      include: {
        product: { select: { id: true, name: true, price: true } },
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.campaign.findMany({
      where: { tenantId },
      include: {
        product: { select: { id: true, name: true, price: true } },
        publications: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string) {
    return this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        product: { select: { id: true, name: true, price: true } },
        publications: true,
      },
    });
  }

  async updateStatus(id: string, tenantId: string, status: string) {
    return this.prisma.campaign.updateMany({
      where: { id, tenantId },
      data: { status },
    });
  }
}
