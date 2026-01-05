/**
 * Sistema de Logging Estruturado
 * Substitui console.log/error/warn por logging estruturado
 * Em produção, apenas logs de nível 'warn' ou superior são exibidos
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true
    if (this.isProduction) {
      // Em produção, apenas warn e error
      return level === 'warn' || level === 'error'
    }
    return true
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context))
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context))
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      }
      console.error(this.formatMessage('error', message, errorContext))
    }
  }

  // Métodos de conveniência para casos comuns
  logApiCall(method: string, path: string, status: number, duration?: number): void {
    this.info('API Call', { method, path, status, duration: duration ? `${duration}ms` : undefined })
  }

  logDatabaseQuery(query: string, duration?: number): void {
    this.debug('Database Query', { query, duration: duration ? `${duration}ms` : undefined })
  }

  logUserAction(userId: string, action: string, context?: LogContext): void {
    this.info('User Action', { userId, action, ...context })
  }

  logError(error: Error | unknown, context?: LogContext): void {
    const message = error instanceof Error ? error.message : 'Unknown error'
    this.error(message, error, context)
  }
}

// Exportar instância singleton
export const logger = new Logger()

// Exportar classe para testes
export { Logger }

