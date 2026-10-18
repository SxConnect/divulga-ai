import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsCipherService } from '../common/services/credentials-cipher.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private cipher: CredentialsCipherService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.integration.findMany({
      where: { tenantId },
      select: {
        id: true,
        channel: true,
        status: true,
        externalAccountId: true,
        createdAt: true,
      },
    });
  }

  async upsert(tenantId: string, channel: string, credentials: string, externalAccountId?: string) {
    const encrypted = this.cipher.encrypt(credentials, tenantId);

    return this.prisma.integration.upsert({
      where: {
        tenantId_channel: { tenantId, channel },
      },
      update: {
        encryptedCredentials: encrypted,
        externalAccountId,
        status: 'active',
      },
      create: {
        tenantId,
        channel,
        encryptedCredentials: encrypted,
        externalAccountId,
      },
      select: {
        id: true,
        channel: true,
        status: true,
      },
    });
  }

  async getDecryptedCredentials(tenantId: string, channel: string): Promise<string | null> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_channel: { tenantId, channel },
      },
    });

    if (!integration) return null;

    if (this.cipher.isEncrypted(integration.encryptedCredentials)) {
      return this.cipher.decrypt(integration.encryptedCredentials, tenantId);
    }

    // Fallback: credencial em texto puro (legado/migração)
    return integration.encryptedCredentials;
  }

  async remove(tenantId: string, channel: string) {
    return this.prisma.integration.deleteMany({
      where: { tenantId, channel },
    });
  }

  async findByChannel(tenantId: string, channel: string) {
    return this.prisma.integration.findUnique({
      where: {
        tenantId_channel: { tenantId, channel },
      },
    });
  }
}
