import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
} from './image-generation.provider';

@Injectable()
export class OpenRouterImageProvider implements ImageGenerationProvider {
  name = 'openrouter-dalle';
  private readonly logger = new Logger(OpenRouterImageProvider.name);

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
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');

    if (!apiKey) {
      return {
        success: false,
        error: 'OPENROUTER_API_KEY não configurada',
      };
    }

    const ctaText = request.ctaText || `Aproveite! R$ ${request.price}`;
    const prompt = this.buildPrompt(request.productName, request.price, ctaText);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.get<string>('PUBLIC_BASE_URL') || 'http://localhost:3000',
          'X-Title': 'Divulga.AI',
        },
        body: JSON.stringify({
          model: 'openai/dall-e-3',
          prompt,
          n: 1,
          size: '1024x1792',
          quality: 'standard',
          response_format: 'url',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error(`Erro na API OpenRouter: ${JSON.stringify(errorData)}`);
        return {
          success: false,
          error: `Erro na API OpenRouter: ${errorData.error?.message || response.statusText}`,
        };
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;

      if (!imageUrl) {
        return { success: false, error: 'Nenhuma imagem retornada pela API' };
      }

      const finalUrl = await this.storage.saveFromUrl(imageUrl, 'images', 'png');

      return { success: true, imageUrl: finalUrl };
    } catch (error) {
      this.logger.error(`Falha na geração OpenRouter: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private buildPrompt(productName: string, price: number, cta: string): string {
    return `Professional product advertisement image for "${productName}". 
Clean modern design, vibrant colors, e-commerce style. 
Show the product prominently with price "${price}" and call-to-action "${cta}". 
High quality, marketing material, white background with subtle gradient.`;
  }
}
