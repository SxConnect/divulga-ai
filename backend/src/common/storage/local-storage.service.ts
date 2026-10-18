import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';

/**
 * Storage local dos artefatos gerados (imagens de IA e vídeos).
 *
 * Os arquivos são gravados em `<cwd>/uploads/<subfolder>` e servidos
 * estaticamente pelo Nest em `/files/<subfolder>/<arquivo>` (ver `main.ts`).
 *
 * Em produção com S3/bucket próprio, basta substituir esta classe por um
 * adapter que cumpra o mesmo contrato (`saveFromUrl` / `saveBuffer` /
 * `getPublicUrl`) — o restante do código não muda.
 */
@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  readonly baseDir = path.resolve(process.cwd(), 'uploads');

  /** URL pública absoluta para um arquivo já salvo em `subfolder`. */
  getPublicUrl(subfolder: string, filename: string): string {
    const base = (
      process.env.PUBLIC_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`
    ).replace(/\/+$/, '');

    return `${base}/files/${subfolder}/${encodeURIComponent(filename)}`;
  }

  /** Baixa um arquivo remoto e o persiste localmente, retornando a URL pública. */
  async saveFromUrl(url: string, subfolder: string, extension = 'jpg'): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
      // Sem o check de `ok`, HTML de página de erro era salvo como imagem e o
      // ffmpeg falhava depois com erro criptográfico.
      throw new BadRequestException(
        `Falha ao baixar artefato de ${url}: HTTP ${response.status}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return this.saveBuffer(buffer, subfolder, extension);
  }

  /** Persiste um buffer em disco e retorna a URL pública. */
  async saveBuffer(buffer: Buffer, subfolder: string, extension: string): Promise<string> {
    const dir = path.join(this.baseDir, subfolder);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${Date.now()}-${randomBytes(6).toString('hex')}.${extension.replace(/^\./, '')}`;
    await fs.writeFile(path.join(dir, filename), buffer);

    this.logger.log(`Artefato salvo: ${subfolder}/${filename} (${buffer.length} bytes)`);
    return this.getPublicUrl(subfolder, filename);
  }
}
