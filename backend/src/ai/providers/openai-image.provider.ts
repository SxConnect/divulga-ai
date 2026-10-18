import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
} from './image-generation.provider';

@Injectable()
export class OpenAIImageProvider implements ImageGenerationProvider {
  name = 'openai-dalle';
  private readonly logger = new Logger(OpenAIImageProvider.name);

  constructor(
    private config: ConfigService,
    @Inject('STORAGE_SERVICE')
    private storage: {
      getPublicUrl: (subfolder: string, filename: string) => string;
      saveFromUrl: (url: string, subfolder: string, extension?: string) => Promise<string>;
      saveBuffer: (buffer: Buffer, subfolder: string, extension: string) => Promise<string>;
    },
  ) {}

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      return {
        success: false,
        error: 'OPENAI_API_KEY não configurada',
      };
    }

    const ctaText = request.ctaText || `Aproveite! R$ ${request.price}`;
    const prompt = this.buildPrompt(request.productName, request.price, ctaText);

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1792', // Formato vertical (9:16)
          quality: 'standard',
          response_format: 'url',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(`Erro na API OpenAI: ${JSON.stringify(errorData)}`);
        return {
          success: false,
          error: `Erro na API OpenAI: ${errorData.error?.message || response.statusText}`,
        };
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;

      if (!imageUrl) {
        return { success: false, error: 'Nenhuma imagem retornada pela API' };
      }

      // TODO: Se a API retornar apenas a imagem base, usar sharp para compor
      // preço e CTA sobre a imagem original do produto
      const composedUrl = await this.composeWithProductImage(
        imageUrl,
        request.originalImageUrls[0],
        request.price,
        ctaText,
      );

      // A URL assinada do DALL-E expira em ~1h: persistimos o artefato no
      // storage próprio para o link continuar válido (e ser republicável).
      const finalUrl = await this.storage.saveFromUrl(composedUrl, 'images', 'png');

      return { success: true, imageUrl: finalUrl };
    } catch (error) {
      this.logger.error(`Falha na geração OpenAI: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private buildPrompt(productName: string, price: number, cta: string): string {
    return `Professional product advertisement image for "${productName}". 
Clean modern design, vibrant colors, e-commerce style. 
Show the product prominently with price "${price}" and call-to-action "${cta}". 
High quality, marketing material, white background with subtle gradient.`;
  }

  private async composeWithProductImage(
    aiGeneratedUrl: string,
    originalProductUrl: string,
    price: number,
    cta: string,
  ): Promise<string> {
    // TODO: Usar sharp para compor imagem original + preço + CTA
    // Por enquanto, retorna a URL gerada pela IA
    this.logger.log('Composição de imagem: usando URL gerada pela IA diretamente');
    return aiGeneratedUrl;
  }
}