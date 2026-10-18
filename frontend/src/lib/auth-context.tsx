'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  plan: string;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { tenantName: string; name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    const savedUser = localStorage.getItem('user');
    const savedTenant = localStorage.getItem('tenant');

    if (token && savedUser && savedTenant) {
      setUser(JSON.parse(savedUser));
      setTenant(JSON.parse(savedTenant));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao fazer login');
    }

    const data = await response.json();
    document.cookie = `token=${data.access_token}; path=/; max-age=86400`;
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('tenant', JSON.stringify(data.tenant));
    setUser(data.user);
    setTenant(data.tenant);
    router.push('/dashboard');
  };

  const register = async (formData: { tenantName: string; name: string; email: string; password: string }) => {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao registrar');
    }

    const data = await response.json();
    document.cookie = `token=${data.access_token}; path=/; max-age=86400`;
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('tenant', JSON.stringify(data.tenant));
    setUser(data.user);
    setTenant(data.tenant);
    router.push('/dashboard');
  };

  const logout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setUser(null);
    setTenant(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
