'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='));
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);

      const response = await fetch(`/api/v1/catalog/products?${params}`, {
        headers: { Authorization: `Bearer ${token?.split('=')[1]}` },
      });
      if (response.ok) {
        setProducts(await response.json());
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Catálogo de Produtos</h1>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar produto..."
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-primary-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchProducts()}
        />
        <select
          className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-primary-500"
          value={category}
          onChange={e => { setCategory(e.target.value); }}
        >
          <option value="">Todas categorias</option>
          <option value="Eletrônicos">Eletrônicos</option>
          <option value="Acessórios">Acessórios</option>
          <option value="Periféricos">Periféricos</option>
        </select>
        <button
          onClick={fetchProducts}
          className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
        >
          Buscar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum produto encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                {product.originalImages?.[0] ? (
                  <img
                    src={product.originalImages[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">📦</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-lg font-bold text-primary-600">
                    R$ {Number(product.price).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {product.supplierCatalog?.name}
                  </span>
                </div>
                <button
                  onClick={() => router.push(`/campaigns?productId=${product.id}`)}
                  className="mt-4 w-full bg-primary-50 text-primary-700 py-2 rounded-md hover:bg-primary-100 text-sm font-medium"
                >
                  Selecionar para Campanha
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
