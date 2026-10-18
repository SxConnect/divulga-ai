'use client';

import { useEffect, useState } from 'react';

export default function AIGenerationPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='));
      const response = await fetch('/api/v1/products', {
        headers: { Authorization: `Bearer ${token?.split('=')[1]}` },
      });
      if (response.ok) {
        setProducts(await response.json());
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const fetchGenerations = async (productId: string) => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='));
      const response = await fetch(`/api/v1/ai/product/${productId}`, {
        headers: { Authorization: `Bearer ${token?.split('=')[1]}` },
      });
      if (response.ok) {
        setGenerations(await response.json());
      }
    } catch (error) {
      console.error('Erro ao carregar gerações:', error);
    }
  };

  const generateImage = async () => {
    if (!selectedProduct) return;
    setGenerating(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='));
      const response = await fetch(`/api/v1/ai/image/${selectedProduct.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token?.split('=')[1]}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Geração iniciada! ID: ${result.id}`);
        fetchGenerations(selectedProduct.id);
      } else {
        const error = await response.json();
        alert(`Erro: ${error.message}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const generateVideo = async () => {
    if (!selectedProduct) return;
    setGenerating(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='));
      const response = await fetch(`/api/v1/ai/video/${selectedProduct.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token?.split('=')[1]}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Geração de vídeo iniciada! ID: ${result.id}`);
        fetchGenerations(selectedProduct.id);
      } else {
        const error = await response.json();
        alert(`Erro: ${error.message}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    fetchGenerations(product.id);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Geração de Conteúdo com IA</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seleção de produto */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Selecionar Produto</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => selectProduct(product)}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  selectedProduct?.id === product.id
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-gray-500">R$ {Number(product.price).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ações de geração */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Gerar Conteúdo</h2>
          
          {selectedProduct ? (
            <div>
              <div className="bg-gray-50 p-4 rounded mb-4">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-gray-500">R$ {Number(selectedProduct.price).toFixed(2)}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={generateImage}
                  disabled={generating}
                  className="w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {generating ? 'Gerando...' : '🎨 Gerar Imagem de Anúncio'}
                </button>

                <button
                  onClick={generateVideo}
                  disabled={generating}
                  className="w-full bg-purple-600 text-white py-3 rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium"
                >
                  {generating ? 'Gerando...' : '🎬 Gerar Vídeo (9:16)'}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Custo: 1 crédito (imagem) ou 3 créditos (vídeo)
              </p>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Selecione um produto para gerar conteúdo
            </div>
          )}
        </div>
      </div>

      {/* Lista de gerações */}
      {selectedProduct && generations.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Gerações Anteriores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generations.map((gen) => (
              <div key={gen.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{gen.type === 'image' ? '🖼️ Imagem' : '🎬 Vídeo'}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    gen.status === 'completed' ? 'bg-green-100 text-green-700' :
                    gen.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {gen.status}
                  </span>
                </div>
                {gen.generatedUrl && (
                  <a
                    href={gen.generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline text-sm"
                  >
                    Visualizar resultado
                  </a>
                )}
                <p className="text-xs text-gray-400 mt-2">{gen.creditsCost} crédito(s)</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
