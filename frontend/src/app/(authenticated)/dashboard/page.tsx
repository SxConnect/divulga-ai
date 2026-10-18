'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='));
      const response = await fetch('/api/v1/metrics/dashboard', {
        headers: { Authorization: `Bearer ${token?.split('=')[1]}` },
      });
      if (response.ok) {
        setData(await response.json());
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Produtos" value={summary.totalProducts || 0} icon="📦" />
        <StatCard title="Campanhas" value={summary.totalCampaigns || 0} icon="📢" />
        <StatCard title="Publicações" value={summary.totalPublications || 0} icon="📱" />
        <StatCard title="Gerações IA" value={summary.totalGenerations || 0} icon="🎨" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Publicações Recentes</h2>
          {data?.recentPublications?.length > 0 ? (
            <div className="space-y-3">
              {data.recentPublications.map((pub: any) => (
                <div key={pub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium">{pub.channel}</p>
                    <p className="text-xs text-gray-500">{pub.campaign?.name}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    pub.status === 'published' ? 'bg-green-100 text-green-700' :
                    pub.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {pub.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nenhuma publicação ainda</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Créditos</h2>
          <div className="text-center py-8">
            <p className="text-4xl font-bold text-primary-600">{summary.creditsUsed || 0}</p>
            <p className="text-sm text-gray-500 mt-2">créditos utilizados</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <span className="text-2xl mr-3">{icon}</span>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
