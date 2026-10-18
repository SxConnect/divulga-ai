import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { TenantId } from '../decorators/tenant-id.decorator';
import { QueueService } from './queue.service';

@ApiTags('Queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('queue')
export class QueuesController {
  constructor(private queueService: QueueService) {}

  @Get('status')
  @Roles('admin')
  @ApiOperation({ summary: 'Status das filas (admin)' })
  async getStats() {
    return this.queueService.getQueueStats();
  }

  @Get('job/:queueName/:jobId')
  @ApiOperation({ summary: 'Status de um job específico (apenas do próprio tenant)' })
  async getJobStatus(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @TenantId() tenantId: string,
  ) {
    return this.queueService.getJobStatus(jobId, queueName, tenantId);
  }
}
