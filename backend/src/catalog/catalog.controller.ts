import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CatalogService } from './catalog.service';
import { IsString } from 'class-validator';

class CreateCatalogDto {
  @IsString()
  name: string;
}

@ApiTags('Catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogos disponíveis (próprios + parceiros)' })
  async findAll(@TenantId() tenantId: string) {
    return this.catalogService.findAll(tenantId);
  }

  @Get('products')
  @ApiOperation({ summary: 'Listar produtos dos catálogos' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findProducts(
    @TenantId() tenantId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.catalogService.findProducts(tenantId, category, search);
  }

  @Post()
  @ApiOperation({ summary: 'Criar catálogo próprio' })
  async createCatalog(@TenantId() tenantId: string, @Body() dto: CreateCatalogDto) {
    return this.catalogService.createCatalog(tenantId, dto);
  }
}
