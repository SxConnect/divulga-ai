'use client';

import { useEffect, useState } from 'react';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [facebookStatus, setFacebookStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getHeaders = (json = false) => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    return {
      Authorization: `Bearer ${token?.split('=')[1]}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
  };

  useEffect(() => {
    finishOAuthIfReturning();
  }, []);

  /**
   * O Facebook volta do OAuth via GET (com ?code&state). O backend repassa
   * esses parâmetros para cá e é aqui que o POST autenticado é feito.
   */
  const finishOAuthIfReturning = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('fb_code');
    const state = params.get('fb_state');
    const error = params.get('fb_error');

    if (error) {
      setMessage({ type: 'error', text: `Facebook recusou a autorização: ${error}` });
      window.history.replaceState({}, '', '/integrations');
    } else if (code && state) {
      setConnecting(true);
      try {
        const response = await fetch('/api/v1/integrations/facebook/callback', {
          method: 'POST',
          headers: getHeaders(true),
          body: JSON.stringify({ code, state }),
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
          setMessage({ type: 'success', text: data.message || 'Facebook conectado!' });
        } else {
          setMessage({ type: 'error', text: data.error || 'Não foi possível conectar a página' });
        }
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Erro ao finalizar a conexão' });
      } finally {
        setConnecting(false);
        window.history.replaceState({}, '', '/integrations');
      }
    }

    fetchIntegrations();
    fetchFacebookStatus();
  };

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/v1/integrations', { headers: getHeaders() });
      if (response.ok) {
        setIntegrations(await response.json());
      }
    } catch (error) {
      console.error('Erro ao carregar integrações:', error);
    }
  };

  const fetchFacebookStatus = async () => {
    try {
      const response = await fetch('/api/v1/integrations/facebook/status', {
        headers: getHeaders(),
      });
      if (response.ok) {
        setFacebookStatus(await response.json());
      }
    } catch (error) {
      console.error('Erro ao verificar Facebook:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectFacebook = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/integrations/facebook/auth-url', {
        headers: getHeaders(),
      });
      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
        return;
      }
      setMessage({ type: 'error', text: 'Não foi possível iniciar a conexão com o Facebook' });
    } catch (error) {
      console.error('Erro ao obter URL de auth:', error);
      setMessage({ type: 'error', text: 'Erro ao iniciar a conexão com o Facebook' });
    }
    setConnecting(false);
  };

  const disconnectFacebook = async () => {
    try {
      await fetch('/api/v1/integrations/facebook/disconnect', {
        method: 'DELETE',
        headers: getHeaders(),
      });
      setFacebookStatus({ connected: false });
      setMessage({ type: 'success', text: 'Facebook desconectado' });
      fetchIntegrations();
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  };

  const integrationsList = [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '📘',
      description: 'Publique em Páginas e Grupos do Facebook',
      available: true,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📸',
      description: 'Publique no Instagram (Reels e Stories)',
      available: false,
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: '🎵',
      description: 'Publique vídeos curtos no TikTok',
      available: false,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      description: 'Envie mensagens via WhatsApp Business',
      available: false,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Integrações</h1>

      {message && (
        <div
          className={`mb-6 rounded-md px-4 py-3 text-sm border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrationsList.map((integration) => {
          const isConnected = integration.id === 'facebook' && facebookStatus?.connected;

          return (
            <div key={integration.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <span className="text-3xl mr-4">{integration.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                    <p className="text-sm text-gray-500">{integration.description}</p>
                  </div>
                </div>

                {isConnected ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                    Conectado
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 text-sm rounded-full">
                    {integration.available ? 'Não conectado' : 'Em breve'}
                  </span>
                )}
              </div>

              {integration.id === 'facebook' && (
                <div className="mt-4 pt-4 border-t">
                  {isConnected ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        Página: <strong>{facebookStatus.pageName}</strong>
                      </p>
                      <button
                        onClick={disconnectFacebook}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Desconectar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={connectFacebook}
                      disabled={connecting || !integration.available}
                      className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {connecting ? 'Conectando...' : 'Conectar Facebook'}
                    </button>
                  )}
                </div>
              )}

              {!integration.available && integration.id !== 'facebook' && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500 italic">
                    Integração será disponibilizada em breve
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
