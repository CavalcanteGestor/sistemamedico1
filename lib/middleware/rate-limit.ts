/**
 * Rate Limiting Middleware
 * Protege APIs contra abuso e ataques de força bruta
 */

interface RateLimitOptions {
  windowMs: number // Janela de tempo em milissegundos
  maxRequests: number // Máximo de requisições na janela
  message?: string // Mensagem de erro personalizada
  skipSuccessfulRequests?: boolean // Não contar requisições bem-sucedidas
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// Store em memória (para produção, considere usar Redis)
const store: RateLimitStore = {}

// Limpar entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 60000) // Limpar a cada minuto

/**
 * Gera uma chave única para rate limiting baseada no IP e rota
 */
function getRateLimitKey(ip: string | null, path: string): string {
  return `${ip || 'unknown'}:${path}`
}

/**
 * Rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Muitas requisições. Tente novamente mais tarde.',
    skipSuccessfulRequests = false,
  } = options

  return async (request: Request): Promise<Response | null> => {
    // Obter IP do cliente
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || 'unknown'

    // Obter path da requisição
    const url = new URL(request.url)
    const path = url.pathname

    const key = getRateLimitKey(ip, path)
    const now = Date.now()

    // Verificar se existe entrada no store
    if (!store[key] || store[key].resetTime < now) {
      // Criar nova entrada
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      }
      return null // Permitir requisição
    }

    // Incrementar contador
    store[key].count++

    // Verificar se excedeu o limite
    if (store[key].count > maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000)

      return new Response(
        JSON.stringify({
          error: message,
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString(),
          },
        }
      )
    }

    // Adicionar headers de rate limit
    const remaining = Math.max(0, maxRequests - store[key].count)
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', maxRequests.toString())
    headers.set('X-RateLimit-Remaining', remaining.toString())
    headers.set('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString())

    return null // Permitir requisição
  }
}

/**
 * Rate limiters pré-configurados para diferentes tipos de endpoints
 */
export const rateLimiters = {
  // Login: 5 tentativas por 15 minutos
  login: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5,
    message: 'Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente.',
  }),

  // APIs gerais: 100 requisições por minuto
  api: rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100,
    message: 'Muitas requisições. Aguarde um momento.',
  }),

  // Criação de recursos: 10 requisições por minuto
  create: rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10,
    message: 'Muitas tentativas de criação. Aguarde um momento.',
  }),

  // WhatsApp: 20 mensagens por minuto
  whatsapp: rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 20,
    message: 'Muitas mensagens. Aguarde um momento antes de enviar mais.',
  }),

  // Upload: 5 uploads por minuto
  upload: rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 5,
    message: 'Muitos uploads. Aguarde um momento.',
  }),
}

