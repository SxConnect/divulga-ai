import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard com métricas consolidadas do tenant' })
  async getDashboard(@TenantId() tenantId: string) {
    return this.metricsService.getDashboard(tenantId);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Métricas por canal' })
  @ApiQuery({ name: 'channel', required: false })
  async getChannelMetrics(
    @TenantId() tenantId: string,
    @Query('channel') channel?: string,
  ) {
    return this.metricsService.getChannelMetrics(tenantId, channel);
  }
}
