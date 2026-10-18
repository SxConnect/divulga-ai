import { Injectable, Logger, Inject } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';
import {
  VideoGenerationProvider,
  VideoGenerationRequest,
  VideoGenerationResult,
} from './video-generation.provider';

const execFileAsync = promisify(execFile);

@Injectable()
export class FFmpegVideoProvider implements VideoGenerationProvider {
  name = 'ffmpeg-slideshow';
  private readonly logger = new Logger(FFmpegVideoProvider.name);
  private readonly tmpDir = '/tmp/divulga-ai-videos';

  constructor(
    @Inject('STORAGE_SERVICE')
    private storage: {
      getPublicUrl: (subfolder: string, filename: string) => string;
      saveFromUrl: (url: string, subfolder: string, extension?: string) => Promise<string>;
      saveBuffer: (buffer: Buffer, subfolder: string, extension: string) => Promise<string>;
    },
  ) {}

  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const duration = request.duration || 15; // 15 segundos padrão
    const imageDuration = duration / request.imageUrls.length;
    const tempFiles: string[] = [];

    try {
      await fs.mkdir(this.tmpDir, { recursive: true });

      // Nome final já conhecido
      const finalName = `${request.productId}-${Date.now()}-${randomBytes(4).toString('hex')}.mp4`;
      const finalPath = path.join(this.tmpDir, finalName);

      const concatFile = path.join(this.tmpDir, `concat-${Date.now()}.txt`);
      tempFiles.push(concatFile);

      // Criar arquivo de concat para ffmpeg
      let concatContent = '';
      for (const imageUrl of request.imageUrls) {
        const localImage = await this.downloadImage(imageUrl);
        tempFiles.push(localImage);
        concatContent += `file '${localImage}'\nduration ${imageDuration}\n`;
      }
      // Última imagem repetida (requisito do ffmpeg concat)
      const lastLocal = await this.downloadImage(request.imageUrls[request.imageUrls.length - 1]);
      tempFiles.push(lastLocal);
      concatContent += `file '${lastLocal}'\n`;

      await fs.writeFile(concatFile, concatContent);

      // Montar vídeo com ffmpeg: slideshow 9:16 (1080x1920)
      await execFileAsync('ffmpeg', [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFile,
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-t', String(duration),
        finalPath,
      ]);

      // Upload para storage (S3/R2 ou local)
      const videoBuffer = await fs.readFile(finalPath);
      const videoUrl = await this.storage.saveBuffer(videoBuffer, 'videos', 'mp4');

      this.logger.log(`Vídeo gerado e armazenado: ${videoUrl}`);

      await this.cleanup(tempFiles);
      await fs.unlink(finalPath).catch(() => {});

      return { success: true, videoUrl };
    } catch (error) {
      this.logger.error(`Falha na geração de vídeo: ${error.message}`);
      await this.cleanup(tempFiles);
      return { success: false, error: error.message };
    }
  }

  private async downloadImage(url: string): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Falha ao baixar imagem ${url}: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = path.join(
      this.tmpDir,
      `img-${Date.now()}-${randomBytes(6).toString('hex')}.jpg`,
    );
    await fs.writeFile(filename, buffer);
    return filename;
  }

  private async cleanup(files: string[]) {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch {}
    }
  }
}