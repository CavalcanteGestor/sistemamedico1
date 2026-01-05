/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuração do Sentry (se DSN estiver configurado)
  ...(process.env.NEXT_PUBLIC_SENTRY_DSN && {
    sentry: {
      hideSourceMaps: true,
    },
  }),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
  // Headers de segurança para produção
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  // NÃO incluir credenciais aqui! Use apenas variáveis de ambiente
  // As variáveis NEXT_PUBLIC_* devem ser configuradas no servidor via .env.production
}

module.exports = nextConfig
