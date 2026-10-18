import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.product.findMany({
      where: {
        OR: [
          { tenantId },
          { supplierCatalog: { type: 'partner_global' } },
        ],
      },
      include: {
        supplierCatalog: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string) {
    return this.prisma.product.findFirst({
      where: {
        id,
        OR: [
          { tenantId },
          { supplierCatalog: { type: 'partner_global' } },
        ],
      },
      include: {
        supplierCatalog: { select: { id: true, name: true } },
      },
    });
  }
}
