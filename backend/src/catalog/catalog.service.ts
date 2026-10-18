import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    // Catálogos próprios do tenant + catálogos globais de parceiros
    return this.prisma.supplierCatalog.findMany({
      where: {
        OR: [
          { tenantId },
          { type: 'partner_global' },
        ],
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            originalImages: true,
            category: true,
          },
        },
      },
    });
  }

  async findProducts(tenantId: string, category?: string, search?: string) {
    return this.prisma.product.findMany({
      where: {
        OR: [
          { tenantId },
          { supplierCatalog: { type: 'partner_global' } },
        ],
        ...(category ? { category } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: {
        supplierCatalog: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCatalog(tenantId: string, data: { name: string }) {
    return this.prisma.supplierCatalog.create({
      data: {
        tenantId,
        name: data.name,
        type: 'own',
      },
    });
  }
}
