'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Catálogo', href: '/catalog', icon: '📦' },
  { name: 'Geração IA', href: '/ai-generation', icon: '🎨' },
  { name: 'Campanhas', href: '/campaigns', icon: '📢' },
  { name: 'Publicações', href: '/publications', icon: '📱' },
  { name: 'Integrações', href: '/integrations', icon: '🔗' },
];

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='));
    if (!token) {
      router.push('/login');
      return;
    }

    const savedUser = localStorage.getItem('user');
    const savedTenant = localStorage.getItem('tenant');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedTenant) setTenant(JSON.parse(savedTenant));
  }, [router]);

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold text-primary-600">Divulga.AI</h1>
            <p className="text-xs text-gray-500 mt-1">{tenant?.name}</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium text-gray-700">{user.name}</p>
                <p className="text-gray-500 text-xs">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64 p-8">
        {children}
      </div>
    </div>
  );
}
