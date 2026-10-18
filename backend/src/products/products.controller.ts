import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos disponíveis' })
  async findAll(@TenantId() tenantId: string) {
    return this.productsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  async findById(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.productsService.findById(id, tenantId);
  }
}
