import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { PublicationsService } from './publications.service';
import { IsString, IsOptional } from 'class-validator';

class PublishDto {
  @IsString()
  campaignId: string;

  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  destination?: string;
}

@ApiTags('Publications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('publications')
export class PublicationsController {
  constructor(private publicationsService: PublicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Publicar campanha em um canal' })
  async publish(@TenantId() tenantId: string, @Body() dto: PublishDto) {
    return this.publicationsService.publish(tenantId, dto.campaignId, dto.channel, dto.destination);
  }

  @Get()
  @ApiOperation({ summary: 'Listar publicações do tenant' })
  async findAll(@TenantId() tenantId: string) {
    return this.publicationsService.findAll(tenantId);
  }

  // Rota estática declarada antes da paramétrica para não ser capturada por :id
  @Get('assisted/:campaignId')
  @ApiOperation({ summary: 'Obter conteúdo pronto para modo assistido (copiar/colar)' })
  async getAssistedContent(
    @Param('campaignId') campaignId: string,
    @TenantId() tenantId: string,
  ) {
    return this.publicationsService.getAssistedContent(tenantId, campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar publicação por ID' })
  async findById(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.publicationsService.findById(id, tenantId);
  }
}
