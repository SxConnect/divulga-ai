export interface ImageGenerationRequest {
  productName: string;
  price: number;
  originalImageUrls: string[];
  ctaText?: string;
  tenantId: string;
  productId: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface ImageGenerationProvider {
  name: string;
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
