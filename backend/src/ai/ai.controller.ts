import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { AIService } from './ai.service';

@ApiTags('AI Generation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AIController {
  constructor(private aiService: AIService) {}

  @Post('image/:productId')
  @ApiOperation({ summary: 'Gerar imagem de anúncio para um produto' })
  async generateImage(
    @Param('productId') productId: string,
    @TenantId() tenantId: string,
  ) {
    return this.aiService.generateImage(tenantId, productId);
  }

  @Post('video/:productId')
  @ApiOperation({ summary: 'Gerar vídeo curto (9:16) para um produto' })
  async generateVideo(
    @Param('productId') productId: string,
    @TenantId() tenantId: string,
  ) {
    return this.aiService.generateVideo(tenantId, productId);
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Verificar status de uma geração' })
  async getStatus(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.aiService.getStatus(id, tenantId);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Listar gerações de um produto' })
  async findByProduct(
    @Param('productId') productId: string,
    @TenantId() tenantId: string,
  ) {
    return this.aiService.findByProduct(productId, tenantId);
  }
}
