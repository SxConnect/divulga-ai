'use client';

import { useEffect, useState } from 'react';

export default function PublicationsPage() {
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assisted, setAssisted] = useState<any>(null);
  const [assistedLoading, setAssistedLoading] = useState(false);

  useEffect(() => {
    fetchPublications();
  }, []);

  const getHeaders = (json = false) => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    return {
      Authorization: `Bearer ${token?.split('=')[1]}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
  };

  const fetchPublications = async () => {
    try {
      const response = await fetch('/api/v1/publications', { headers: getHeaders() });
      if (response.ok) {
        setPublications(await response.json());
      }
    } catch (error) {
      console.error('Erro ao carregar publicações:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Modo assistido: canais sem integração oficial (Instagram, TikTok, WhatsApp,
   * grupos do Facebook) — devolve o texto pronto para copiar e colar.
   */
  const getAssistedContent = async (campaignId: string) => {
    setAssistedLoading(true);
    try {
      const response = await fetch(`/api/v1/publications/assisted/${campaignId}`, {
        headers: getHeaders(),
      });

      if (response.ok) {
        setAssisted(await response.json());
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.message || 'Não foi possível obter o conteúdo');
      }
    } catch (error) {
      console.error('Erro ao buscar conteúdo assistido:', error);
    } finally {
      setAssistedLoading(false);
    }
  };

  const copyAssistedText = async () => {
    if (!assisted) return;
    const text = `${assisted.suggestedText}\n\n${assisted.hashtags}`;
    try {
      await navigator.clipboard.writeText(text);
      alert('Conteúdo copiado! Cole no canal desejado.');
    } catch {
      alert(`Copie o conteúdo abaixo:\n\n${text}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Publicações</h1>

      {/* Painel do modo assistido */}
      {assisted && (
        <div className="mb-6 bg-white rounded-lg shadow p-6 border-l-4 border-primary-500">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Modo assistido — {assisted.productName}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Copie o conteúdo abaixo e cole nos canais sem integração oficial.
              </p>
            </div>
            <button
              onClick={() => setAssisted(null)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Fechar
            </button>
          </div>

          <pre className="mt-4 whitespace-pre-wrap bg-gray-50 rounded-md p-4 text-sm text-gray-800 font-sans">
{`${assisted.suggestedText}\n\n${assisted.hashtags}`}
          </pre>

          <button
            onClick={copyAssistedText}
            className="mt-3 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm font-medium"
          >
            Copiar conteúdo
          </button>
        </div>
      )}

      {publications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhuma publicação ainda
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campanha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Publicado em</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {publications.map((pub) => (
                <tr key={pub.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                      {pub.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pub.campaign?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-sm rounded-full ${
                      pub.status === 'published' ? 'bg-green-100 text-green-700' :
                      pub.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {pub.status}
                    </span>
                    {pub.status === 'failed' && pub.result?.error && (
                      <p className="text-xs text-red-500 mt-1 max-w-xs">{pub.result.error}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pub.publishedAt ? new Date(pub.publishedAt).toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {pub.externalPostId && (
                      <span className="text-gray-500 text-xs block mb-1">{pub.externalPostId}</span>
                    )}
                    {pub.campaign?.id && (
                      <button
                        onClick={() => getAssistedContent(pub.campaign.id)}
                        disabled={assistedLoading}
                        className="text-primary-700 hover:text-primary-900 font-medium disabled:opacity-50"
                      >
                        Modo assistido
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
