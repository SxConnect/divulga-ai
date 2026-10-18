const API_BASE = '/api/v1';

async function getAuthToken(): Promise<string | null> {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
    throw new Error('Não autenticado');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || 'Erro na requisição');
  }

  return response.json();
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    apiRequest<{ access_token: string; user: any; tenant: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { tenantName: string; name: string; email: string; password: string }) =>
    apiRequest<{ access_token: string; user: any; tenant: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Products
export const products = {
  list: () => apiRequest<any[]>('/products'),
  get: (id: string) => apiRequest<any>(`/products/${id}`),
};

// Catalog
export const catalog = {
  list: () => apiRequest<any[]>('/catalog'),
  listProducts: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    return apiRequest<any[]>(`/catalog/products?${params.toString()}`);
  },
};

// AI
export const ai = {
  generateImage: (productId: string) =>
    apiRequest<any>(`/ai/image/${productId}`, { method: 'POST' }),
  generateVideo: (productId: string) =>
    apiRequest<any>(`/ai/video/${productId}`, { method: 'POST' }),
  getStatus: (id: string) => apiRequest<any>(`/ai/status/${id}`),
  listByProduct: (productId: string) => apiRequest<any[]>(`/ai/product/${productId}`),
};

// Campaigns
export const campaigns = {
  list: () => apiRequest<any[]>('/campaigns'),
  get: (id: string) => apiRequest<any>(`/campaigns/${id}`),
  create: (data: { productId: string; name: string; selectedChannels: string[]; scheduledAt?: string }) =>
    apiRequest<any>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    apiRequest<any>(`/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// Publications
export const publications = {
  list: () => apiRequest<any[]>('/publications'),
  get: (id: string) => apiRequest<any>(`/publications/${id}`),
  publish: (campaignId: string, channel: string, destination?: string) =>
    apiRequest<any>('/publications', {
      method: 'POST',
      body: JSON.stringify({ campaignId, channel, destination }),
    }),
  getAssisted: (campaignId: string) =>
    apiRequest<any>(`/publications/assisted/${campaignId}`),
};

// Credits
export const credits = {
  getBalance: () => apiRequest<{ balance: number }>('/credits/balance'),
  getHistory: () => apiRequest<any[]>('/credits/history'),
};

// Metrics
export const metrics = {
  getDashboard: () => apiRequest<any>('/metrics/dashboard'),
  getChannelMetrics: (channel?: string) => {
    const params = channel ? `?channel=${channel}` : '';
    return apiRequest<any[]>(`/metrics/channels${params}`);
  },
};

// Integrations
export const integrations = {
  list: () => apiRequest<any[]>('/integrations'),
  connect: (channel: string, credentials: string) =>
    apiRequest<any>('/integrations/connect', {
      method: 'POST',
      body: JSON.stringify({ channel, credentials }),
    }),
  remove: (channel: string) =>
    apiRequest<any>(`/integrations/${channel}`, { method: 'DELETE' }),
};

// Facebook
export const facebook = {
  getAuthUrl: () => apiRequest<{ url: string; state: string }>('/integrations/facebook/auth-url'),
  callback: (code: string, state: string) =>
    apiRequest<any>('/integrations/facebook/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    }),
  getStatus: () => apiRequest<any>('/integrations/facebook/status'),
  disconnect: () =>
    apiRequest<any>('/integrations/facebook/disconnect', { method: 'DELETE' }),
};
