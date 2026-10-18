import { Controller, Get, Post, Delete, Query, Body, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { FacebookAuthService } from './facebook-auth.service';
import { IntegrationsService } from '../integrations.service';
import { IsString } from 'class-validator';

class FacebookCallbackDto {
  @IsString()
  code: string;

  @IsString()
  state: string;
}

@ApiTags('Facebook Integration')
@ApiBearerAuth()
@Controller('integrations/facebook')
export class FacebookController {
  constructor(
    private facebookAuth: FacebookAuthService,
    private integrationsService: IntegrationsService,
  ) {}

  private get frontendUrl(): string {
    return (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/+$/, '');
  }

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Gerar URL de autorização OAuth do Facebook' })
  async getAuthUrl(@TenantId() tenantId: string) {
    // O state é registrado no servidor e vinculado ao tenant que iniciou o fluxo
    const state = this.facebookAuth.createState(tenantId);
    const url = this.facebookAuth.getOAuthUrl(state);
    return { url, state };
  }

  /**
   * Redirect do Facebook (sempre via GET, direto no navegador).
   * Não exige JWT: apenas encaminha `code`/`state` para o frontend, que então
   * chama o POST /callback autenticado. Antes este GET caía em 404 e o fluxo
   * OAuth nunca completava.
   */
  @Get('callback')
  @ApiOperation({ summary: 'Redirect OAuth do Facebook (chamado pelo navegador)' })
  async callbackRedirect(
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
  ) {
    const target = new URL(`${this.frontendUrl}/integrations`);

    if (error) {
      target.searchParams.set('fb_error', errorDescription || error);
      return res.redirect(target.toString());
    }

    if (!code || !state) {
      target.searchParams.set('fb_error', 'Parâmetros ausentes no callback do Facebook');
      return res.redirect(target.toString());
    }

    target.searchParams.set('fb_code', code);
    target.searchParams.set('fb_state', state);
    return res.redirect(target.toString());
  }

  @Post('callback')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Callback OAuth - trocar code por token e conectar página' })
  async callback(
    @TenantId() tenantId: string,
    @Body() dto: FacebookCallbackDto,
  ) {
    // CSRF: o state precisa existir, não estar expirado e pertencer ao tenant
    const stateTenantId = this.facebookAuth.consumeState(dto.state);

    if (!stateTenantId || stateTenantId !== tenantId) {
      return {
        success: false,
        error: 'Sessão OAuth inválida ou expirada. Inicie a conexão novamente.',
      };
    }

    const shortToken = await this.facebookAuth.exchangeCodeForToken(dto.code);
    const longToken = await this.facebookAuth.getLongLivedToken(shortToken.access_token);
    const pages = await this.facebookAuth.getPages(longToken.access_token);

    if (pages.length === 0) {
      return {
        success: false,
        error: 'Nenhuma página encontrada.',
      };
    }

    const page = pages[0];
    const credentials = JSON.stringify({
      userAccessToken: longToken.access_token,
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      expiresIn: longToken.expires_in,
      connectedAt: new Date().toISOString(),
    });

    await this.integrationsService.upsert(tenantId, 'facebook', credentials, page.id);

    return {
      success: true,
      page: { id: page.id, name: page.name },
      message: `Página "${page.name}" conectada com sucesso`,
    };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verificar status da integração Facebook' })
  async getStatus(@TenantId() tenantId: string) {
    const integration = await this.integrationsService.findByChannel(tenantId, 'facebook');

    if (!integration) {
      return { connected: false };
    }

    try {
      const credentials = await this.integrationsService.getDecryptedCredentials(tenantId, 'facebook');
      const parsed = JSON.parse(credentials || '{}');
      return {
        connected: true,
        pageId: parsed.pageId,
        pageName: parsed.pageName,
        connectedAt: parsed.connectedAt,
        status: integration.status,
      };
    } catch {
      return { connected: false, error: 'Credenciais inválidas' };
    }
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Desconectar integração Facebook' })
  async disconnect(@TenantId() tenantId: string) {
    await this.integrationsService.remove(tenantId, 'facebook');
    return { success: true, message: 'Facebook desconectado' };
  }
}
