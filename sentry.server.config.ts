// Sentry Server Configuration
// Este arquivo é carregado apenas no servidor

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Ajustar sample rate em produção
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Ambiente
  environment: process.env.NODE_ENV || 'development',
  
  // Habilitar debug apenas em desenvolvimento
  debug: process.env.NODE_ENV === 'development',
  
  // Filtrar eventos sensíveis
  beforeSend(event, hint) {
    // Remover dados sensíveis
    if (event.request) {
      delete event.request.cookies
      if (event.request.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
    }
    return event
  },
})

