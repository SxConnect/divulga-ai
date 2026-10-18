import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

/**
 * Storage S3-compatível (AWS S3, Cloudflare R2, Supabase Storage, MinIO, etc.).
 *
 * Implementa o mesmo contrato de `LocalStorageService` para troca transparente:
 * - `getPublicUrl(subfolder, filename)` → URL pública do objeto
 * - `saveFromUrl(url, subfolder, extension)` → baixa e faz upload
 * - `saveBuffer(buffer, subfolder, extension)` → upload direto de buffer
 *
 * Configuração via variáveis de ambiente:
 *   STORAGE_ENDPOINT        - endpoint do S3 (ex: https://<account>.r2.cloudflarestorage.com)
 *   STORAGE_BUCKET          - nome do bucket
 *   STORAGE_ACCESS_KEY      - access key
 *   STORAGE_SECRET_KEY      - secret key
 *   STORAGE_REGION          - região (default: auto)
 *   STORAGE_PUBLIC_URL      - URL pública base (ex: https://cdn.seudominio.com)
 *                             Se não informado, usa `STORAGE_ENDPOINT/bucket`
 */
@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly keyPrefix = 'divulga-ai/';

  constructor() {
    const endpoint = process.env.STORAGE_ENDPOINT;
    const bucket = process.env.STORAGE_BUCKET;
    const accessKey = process.env.STORAGE_ACCESS_KEY;
    const secretKey = process.env.STORAGE_SECRET_KEY;
    const region = process.env.STORAGE_REGION || 'auto';

    if (!endpoint || !bucket || !accessKey || !secretKey) {
      throw new Error(
        'S3StorageService requer STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY e STORAGE_SECRET_KEY',
      );
    }

    this.bucket = bucket;
    this.publicBaseUrl = (
      process.env.STORAGE_PUBLIC_URL ||
      `${endpoint.replace(/\/+$/, '')}/${bucket}`
    ).replace(/\/+$/, '');

    this.client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      // R2 e alguns provedores exigem path-style
      forcePathStyle: true,
    });

    this.logger.log(`S3StorageService inicializado: bucket=${bucket}, endpoint=${endpoint}`);
  }

  /** URL pública absoluta para um objeto já salvo. */
  getPublicUrl(subfolder: string, filename: string): string {
    const key = this.normalizeKey(subfolder, filename);
    return `${this.publicBaseUrl}/${encodeURIComponent(key)}`;
  }

  /** Baixa um arquivo remoto e faz upload para o S3, retornando a URL pública. */
  async saveFromUrl(url: string, subfolder: string, extension = 'jpg'): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new BadRequestException(
        `Falha ao baixar artefato de ${url}: HTTP ${response.status}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return this.saveBuffer(buffer, subfolder, extension);
  }

  /** Faz upload de um buffer para o S3 e retorna a URL pública. */
  async saveBuffer(buffer: Buffer, subfolder: string, extension: string): Promise<string> {
    const key = this.normalizeKey(
      subfolder,
      `${Date.now()}-${randomBytes(6).toString('hex')}.${extension.replace(/^\./, '')}`,
    );

    const contentType = this.contentTypeForExtension(extension);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Cache longo para assets imutáveis (hash no nome)
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    this.logger.log(`Upload S3: ${key} (${buffer.length} bytes, ${contentType})`);
    return this.getPublicUrl('', key);
  }

  /** Remove um objeto do bucket. */
  async deleteObject(subfolder: string, filename: string): Promise<void> {
    const key = this.normalizeKey(subfolder, filename);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /** Verifica se o objeto existe. */
  async exists(subfolder: string, filename: string): Promise<boolean> {
    try {
      const key = this.normalizeKey(subfolder, filename);
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  private normalizeKey(subfolder: string, filename: string): string {
    const cleanSub = subfolder.replace(/^\/+|\/+$/g, '');
    const cleanFile = filename.replace(/^\/+/, '');
    return `${this.keyPrefix}${cleanSub}/${cleanFile}`.replace(/\/+/, '/');
  }

  private contentTypeForExtension(ext: string): string {
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      pdf: 'application/pdf',
      json: 'application/json',
    };
    return map[ext.toLowerCase().replace(/^\./, '')] || 'application/octet-stream';
  }
}