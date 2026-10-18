/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
      {
        // Artefatos gerados pelo backend (imagens de IA e vídeos)
        source: '/files/:path*',
        destination: 'http://localhost:4000/files/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
