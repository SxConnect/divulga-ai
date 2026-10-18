export interface VideoGenerationRequest {
  productName: string;
  price: number;
  imageUrls: string[];
  duration?: number; // segundos
  tenantId: string;
  productId: string;
}

export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

export interface VideoGenerationProvider {
  name: string;
  generate(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
}
