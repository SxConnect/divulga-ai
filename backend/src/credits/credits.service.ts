import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditsService {
  constructor(private prisma: PrismaService) {}

  async getBalance(tenantId: string): Promise<number> {
    const result = await this.prisma.creditLedger.aggregate({
      where: { tenantId },
      _sum: { quantity: true },
    });

    return result._sum.quantity || 0;
  }

  async debit(tenantId: string, amount: number, reference?: string) {
    return this.prisma.creditLedger.create({
      data: {
        tenantId,
        type: 'consumption',
        quantity: -amount,
        reference,
      },
    });
  }

  async recharge(tenantId: string, amount: number, reference?: string) {
    return this.prisma.creditLedger.create({
      data: {
        tenantId,
        type: 'recharge',
        quantity: amount,
        reference,
      },
    });
  }

  /**
   * Estorna uma referência de forma idempotente.
   *
   * O evento de falha das filas é disparado a cada tentativa, então sem esta
   * guarda o mesmo job devolveria crédito mais de uma vez.
   */
  async refundOnce(
    tenantId: string,
    amount: number,
    reference: string,
  ): Promise<boolean> {
    if (amount <= 0) return false;

    const alreadyRefunded = await this.prisma.creditLedger.findFirst({
      where: { tenantId, type: 'recharge', reference },
    });

    if (alreadyRefunded) return false;

    await this.recharge(tenantId, amount, reference);
    return true;
  }

  async getHistory(tenantId: string) {
    return this.prisma.creditLedger.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
