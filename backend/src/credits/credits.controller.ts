import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CreditsService } from './credits.service';
import { IsNumber, Min } from 'class-validator';

class RechargeDto {
  @IsNumber()
  @Min(1)
  amount: number;
}

@ApiTags('Credits')
@ApiBearerAuth()
// RolesGuard é obrigatório aqui: sem ele o @Roles('admin') do recharge é ignorado
// e qualquer usuário comum se concederia créditos.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('credits')
export class CreditsController {
  constructor(private creditsService: CreditsService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Consultar saldo de créditos' })
  async getBalance(@TenantId() tenantId: string) {
    const balance = await this.creditsService.getBalance(tenantId);
    return { balance };
  }

  @Get('history')
  @ApiOperation({ summary: 'Histórico de movimentação de créditos' })
  async getHistory(@TenantId() tenantId: string) {
    return this.creditsService.getHistory(tenantId);
  }

  @Post('recharge')
  @Roles('admin')
  @ApiOperation({ summary: 'Recarregar créditos (admin)' })
  async recharge(@TenantId() tenantId: string, @Body() dto: RechargeDto) {
    return this.creditsService.recharge(tenantId, dto.amount, 'Recarga manual');
  }
}
