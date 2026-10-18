import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from '../../common/storage/local-storage.service';
import { ImageGenerationProvider } from './image-generation.provider';
import { VideoGenerationProvider } from './video-generation.provider';
import { OpenAIImageProvider } from './openai-image.provider';
import { FFmpegVideoProvider } from './ffmpeg-video.provider';

@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger(ProviderFactory.name);

  constructor(
    private config: ConfigService,
    private storage: LocalStorageService,
  ) {}

  getImageProvider(): ImageGenerationProvider {
    const provider = this.config.get<string>('AI_PROVIDER', 'openai');

    switch (provider) {
      case 'openai':
        this.logger.log(`Usando provedor de imagem: ${provider}`);
        return new OpenAIImageProvider(this.config, this.storage);
      default:
        this.logger.warn(`Provedor "${provider}" não encontrado, usando OpenAI`);
        return new OpenAIImageProvider(this.config, this.storage);
    }
  }

  getVideoProvider(): VideoGenerationProvider {
    // Por enquanto, apenas ffmpeg está disponível
    this.logger.log('Usando provedor de vídeo: ffmpeg-slideshow');
    return new FFmpegVideoProvider(this.storage);
  }
}
