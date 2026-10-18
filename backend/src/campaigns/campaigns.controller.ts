import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CampaignsService } from './campaigns.service';
import { IsString, IsArray, IsOptional, IsDateString } from 'class-validator';

class CreateCampaignDto {
  @IsString()
  productId: string;

  @IsString()
  name: string;

  @IsArray()
  selectedChannels: string[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova campanha' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar campanhas do tenant' })
  async findAll(@TenantId() tenantId: string) {
    return this.campaignsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar campanha por ID' })
  async findById(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.campaignsService.findById(id, tenantId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status da campanha' })
  async updateStatus(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body('status') status: string,
  ) {
    return this.campaignsService.updateStatus(id, tenantId, status);
  }
}
