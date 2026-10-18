'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tenantName: '',
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isRegister ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const body = isRegister
        ? form
        : { email: form.email, password: form.password };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao autenticar');
      }

      const data = await response.json();
      document.cookie = `token=${data.access_token}; path=/; max-age=86400`;
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">Divulga.AI</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Plataforma de divulgação com IA
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow" onSubmit={handleSubmit}>
          <h2 className="text-xl font-semibold text-center">
            {isRegister ? 'Criar conta' : 'Entrar'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
          )}

          <div className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome da Loja</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={form.tenantName}
                    onChange={e => setForm({ ...form, tenantName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Seu nome</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Carregando...' : isRegister ? 'Criar conta' : 'Entrar'}
          </button>

          <p className="text-center text-sm text-gray-600">
            {isRegister ? 'Já tem uma conta?' : 'Não tem uma conta?'}{' '}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              {isRegister ? 'Entrar' : 'Criar conta'}
            </button>
          </p>

          {!isRegister && (
            <div className="text-xs text-gray-500 text-center mt-4">
              <p>Demo: admin@demo.com / 123456</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
