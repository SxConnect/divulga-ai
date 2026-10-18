import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface FacebookPageInfo {
  id: string;
  name: string;
  access_token: string;
}

interface PendingOAuthState {
  tenantId: string;
  expiresAt: number;
}

@Injectable()
export class FacebookAuthService {
  private readonly logger = new Logger(FacebookAuthService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;

  /**
   * Estados OAuth pendentes (proteção CSRF / account-linking).
   * Em produção com múltiplas instâncias, trocar por Redis.
   */
  private readonly pendingStates = new Map<string, PendingOAuthState>();
  private static readonly STATE_TTL_MS = 10 * 60 * 1000;

  constructor(private config: ConfigService) {
    this.appId = this.config.get<string>('FACEBOOK_APP_ID', '');
    this.appSecret = this.config.get<string>('FACEBOOK_APP_SECRET', '');
    this.redirectUri = this.config.get<string>('FACEBOOK_REDIRECT_URI', 'http://localhost:3000/api/v1/integrations/facebook/callback');
  }

  /** Gera e registra um `state` vinculado ao tenant que iniciou o fluxo. */
  createState(tenantId: string): string {
    const state = require('crypto').randomBytes(16).toString('hex');
    this.pendingStates.set(state, {
      tenantId,
      expiresAt: Date.now() + FacebookAuthService.STATE_TTL_MS,
    });

    // Limpeza oportunista de estados expirados
    for (const [key, value] of this.pendingStates) {
      if (value.expiresAt < Date.now()) this.pendingStates.delete(key);
    }

    return state;
  }

  /** Valida e consome o `state`; retorna o tenantId dono do fluxo (ou null). */
  consumeState(state: string): string | null {
    const pending = this.pendingStates.get(state);
    if (!pending) return null;

    this.pendingStates.delete(state);

    if (pending.expiresAt < Date.now()) {
      this.logger.warn(`State OAuth expirado para tenant ${pending.tenantId}`);
      return null;
    }

    return pending.tenantId;
  }

  getOAuthUrl(state: string): string {
    const scopes = [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_show_list',
    ].join(',');

    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${this.appId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scopes}&response_type=code&state=${state}`;
  }

  async exchangeCodeForToken(code: string): Promise<FacebookTokenResponse> {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${this.appId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&client_secret=${this.appSecret}&code=${code}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao trocar code por token: ${error.error?.message}`);
    }

    return response.json();
  }

  async getLongLivedToken(shortLivedToken: string): Promise<FacebookTokenResponse> {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${shortLivedToken}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao obter token de longa duração: ${error.error?.message}`);
    }

    return response.json();
  }

  async getPages(accessToken: string): Promise<FacebookPageInfo[]> {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}&fields=id,name,access_token`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao buscar páginas: ${error.error?.message}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  async getPageAccessToken(pageId: string, userAccessToken: string): Promise<string> {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?fields=access_token&access_token=${userAccessToken}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao buscar page access token: ${error.error?.message}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  async publishToPage(
    pageId: string,
    pageAccessToken: string,
    message: string,
    imageUrl?: string,
  ): Promise<{ postId: string }> {
    let endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
    const body: Record<string, string> = {
      message,
      access_token: pageAccessToken,
    };

    if (imageUrl) {
      body.url = imageUrl;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao publicar na página: ${error.error?.message}`);
    }

    const data = await response.json();
    return { postId: data.id };
  }

  async publishVideoToPage(
    pageId: string,
    pageAccessToken: string,
    videoUrl: string,
    description: string,
  ): Promise<{ postId: string }> {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/videos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: videoUrl,
          description,
          access_token: pageAccessToken,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao publicar vídeo: ${error.error?.message}`);
    }

    const data = await response.json();
    return { postId: data.id };
  }

  async getPageInsights(
    pageId: string,
    pageAccessToken: string,
    metrics: string[] = ['page_impressions', 'page_engaged_users'],
  ): Promise<Record<string, any>> {
    const metricsStr = metrics.join(',');
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/insights?metric=${metricsStr}&access_token=${pageAccessToken}`,
    );

    if (!response.ok) {
      const error = await response.json();
      this.logger.error(`Erro ao buscar insights: ${error.error?.message}`);
      return {};
    }

    return response.json();
  }
}
