'use client';

import { useEffect, useState } from 'react';

// Canais com integração oficial implementada no backend.
// Os demais ficam visíveis, porém indisponíveis para publicação.
const channels = [
  { id: 'facebook', label: 'Facebook', available: true },
  { id: 'instagram', label: 'Instagram', available: false },
  { id: 'tiktok', label: 'TikTok', available: false },
  { id: 'whatsapp', label: 'WhatsApp', available: false },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    productId: '',
    selectedChannels: [] as string[],
  });

  useEffect(() => {
    // Lido de window para evitar a exigência de <Suspense> do useSearchParams
    const productId = new URLSearchParams(window.location.search).get('productId');
    if (productId) {
      setForm(prev => ({ ...prev, productId }));
      setShowCreate(true);
    }

    fetchData();
  }, []);

  const getHeaders = (json = false) => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    return {
      Authorization: `Bearer ${token?.split('=')[1]}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
  };

  const fetchData = async () => {
    try {
      const [campaignsRes, productsRes] = await Promise.all([
        fetch('/api/v1/campaigns', { headers: getHeaders() }),
        fetch('/api/v1/products', { headers: getHeaders() }),
      ]);

      if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/v1/campaigns', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(form),
      });

      if (response.ok) {
        setShowCreate(false);
        setForm({ name: '', productId: '', selectedChannels: [] });
        fetchData();
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.message || 'Não foi possível criar a campanha');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar campanha');
    }
  };

  const handlePublish = async (campaignId: string, channel: string) => {
    setError('');
    setPublishing(`${campaignId}:${channel}`);
    try {
      const response = await fetch('/api/v1/publications', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ campaignId, channel }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || `Não foi possível publicar no ${channel}`);
        return;
      }

      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erro ao publicar');
    } finally {
      setPublishing(null);
    }
  };

  const toggleChannel = (channelId: string) => {
    setForm(prev => ({
      ...prev,
      selectedChannels: prev.selectedChannels.includes(channelId)
        ? prev.selectedChannels.filter(c => c !== channelId)
        : [...prev.selectedChannels, channelId],
    }));
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          + Nova Campanha
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Modal de criação */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nova Campanha</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Produto</label>
                <select
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={form.productId}
                  onChange={e => setForm({ ...form, productId: e.target.value })}
                >
                  <option value="">Selecionar produto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Canais</label>
                <div className="space-y-2">
                  {channels.map(channel => (
                    <label
                      key={channel.id}
                      className={`flex items-center ${channel.available ? '' : 'opacity-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.selectedChannels.includes(channel.id)}
                        onChange={() => toggleChannel(channel.id)}
                        className="mr-2"
                      />
                      {channel.label}
                      {!channel.available && (
                        <span className="ml-2 text-xs text-gray-400">(em breve)</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de campanhas */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhuma campanha criada ainda
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                  <p className="text-sm text-gray-500">{campaign.product?.name}</p>
                </div>
                <span className={`px-3 py-1 text-sm rounded-full ${
                  campaign.status === 'completed' ? 'bg-green-100 text-green-700' :
                  campaign.status === 'running' ? 'bg-blue-100 text-blue-700' :
                  campaign.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {campaign.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(campaign.selectedChannels as string[]).map(channelId => {
                  const channel = channels.find(c => c.id === channelId);
                  const isPublishing = publishing === `${campaign.id}:${channelId}`;

                  return (
                    <div
                      key={channelId}
                      className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                    >
                      <span>{channel?.label || channelId}</span>
                      {channel?.available ? (
                        <button
                          onClick={() => handlePublish(campaign.id, channelId)}
                          disabled={isPublishing}
                          className="ml-1 text-primary-700 font-medium hover:text-primary-900 disabled:opacity-50"
                        >
                          {isPublishing ? 'Publicando...' : 'Publicar'}
                        </button>
                      ) : (
                        <span className="ml-1 text-gray-400 italic">em breve</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {campaign.publications?.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Publicações:</p>
                  <div className="space-y-1">
                    {campaign.publications.map((pub: any) => (
                      <div key={pub.id} className="flex items-center justify-between text-sm">
                        <span>{pub.channel}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          pub.status === 'published' ? 'bg-green-100 text-green-700' :
                          pub.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {pub.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
