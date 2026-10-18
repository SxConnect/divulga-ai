import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { IntegrationsService } from './integrations.service';
import { IsString, IsOptional } from 'class-validator';

class ConnectDto {
  @IsString()
  channel: string;

  @IsString()
  credentials: string;

  @IsOptional()
  @IsString()
  externalAccountId?: string;
}

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar integrações do tenant' })
  async findAll(@TenantId() tenantId: string) {
    return this.integrationsService.findAll(tenantId);
  }

  @Post('connect')
  @ApiOperation({ summary: 'Conectar um canal (Facebook, Instagram, etc.)' })
  async connect(@TenantId() tenantId: string, @Body() dto: ConnectDto) {
    return this.integrationsService.upsert(
      tenantId,
      dto.channel,
      dto.credentials,
      dto.externalAccountId,
    );
  }

  @Delete(':channel')
  @ApiOperation({ summary: 'Desconectar um canal' })
  async remove(@TenantId() tenantId: string, @Param('channel') channel: string) {
    return this.integrationsService.remove(tenantId, channel);
  }
}
