import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { UsersService } from './users.service';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  role?: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Criar novo usuário no tenant (admin)' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuários do tenant' })
  async findAll(@TenantId() tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  async findById(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.usersService.findById(id, tenantId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Remover usuário (admin)' })
  async remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.usersService.remove(id, tenantId);
  }
}
