/**
 * CORS Configuration
 * Configuração de CORS para produção
 */

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL?.replace('https://', 'https://www.'),
  ].filter(Boolean) as string[]

  // Em desenvolvimento, permitir localhost
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000')
  }

  const isAllowedOrigin = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.startsWith(allowed)
  )

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : (allowedOrigins[0] || '*'),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 horas
  }
}

export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    const headers = getCorsHeaders(origin)
    
    return new Response(null, {
      status: 204,
      headers,
    })
  }

  return null
}

