import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CredentialsCipherService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const rawKey = this.configService.get<string>('MASTER_ENCRYPTION_KEY');
    if (!rawKey) {
      throw new InternalServerErrorException('MASTER_ENCRYPTION_KEY não configurada');
    }
    // Aceita hex (64 chars) ou base64 (44 chars)
    if (rawKey.length === 64) {
      this.key = Buffer.from(rawKey, 'hex');
    } else {
      this.key = Buffer.from(rawKey, 'base64');
    }
    if (this.key.length !== 32) {
      throw new InternalServerErrorException('MASTER_ENCRYPTION_KEY deve ter 32 bytes (256 bits)');
    }
  }

  /**
   * Criptografa texto plaintext usando AES-256-GCM.
   * Formato de saída: iv:authTag:ciphertext (todos em base64)
   */
  encrypt(plaintext: string, tenantId: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    // AAD (Additional Authenticated Data) para binding ao tenant
    cipher.setAAD(Buffer.from(tenantId, 'utf8'));

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  /**
   * Descriptografa texto no formato iv:authTag:ciphertext.
   * Valida o tenant_id via AAD para garantir isolamento.
   */
  decrypt(ciphertext: string, tenantId: string): string {
    const [ivB64, authTagB64, encryptedB64] = ciphertext.split(':');

    if (!ivB64 || !authTagB64 || !encryptedB64) {
      throw new InternalServerErrorException('Formato de credencial criptografada inválido');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(tenantId, 'utf8'));

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Verifica se um texto já está criptografado (formato iv:tag:ciphertext).
   */
  isEncrypted(value: string): boolean {
    const parts = value.split(':');
    if (parts.length !== 3) return false;
    try {
      Buffer.from(parts[0], 'base64');
      Buffer.from(parts[1], 'base64');
      Buffer.from(parts[2], 'base64');
      return true;
    } catch {
      return false;
    }
  }
}
