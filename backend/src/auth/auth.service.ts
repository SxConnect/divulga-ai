import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(data: {
    tenantName: string;
    name: string;
    email: string;
    password: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: data.tenantName,
        planLimits: {
          maxGenerations: 50,
          maxPublications: 100,
          maxUsers: 3,
        },
      },
    });

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'admin',
      },
    });

    // Gerar 100 créditos iniciais
    await this.prisma.creditLedger.create({
      data: {
        tenantId: tenant.id,
        type: 'recharge',
        quantity: 100,
        reference: 'Créditos iniciais do plano Starter',
      },
    });

    return this.generateToken(user, tenant);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.generateToken(user, user.tenant);
  }

  private generateToken(user: any, tenant: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
      },
    };
  }
}
