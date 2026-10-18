/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
      {
        // Artefatos gerados pelo backend (imagens de IA e vídeos)
        source: '/files/:path*',
        destination: `${apiBase}/files/:path*`,
      },
    ];
  },
  // Desabilita otimização de imagem do Next (usamos /files/* do backend)
  images: {
    loader: 'default',
    domains: ['localhost'],
  },
};

module.exports = nextConfig;