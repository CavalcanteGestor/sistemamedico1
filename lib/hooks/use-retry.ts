import { useState, useCallback, useRef } from 'react'

interface UseRetryOptions {
  maxRetries?: number
  retryDelay?: number
  onRetry?: (attempt: number) => void
  onMaxRetriesReached?: () => void
}

export function useRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: UseRetryOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
    onMaxRetriesReached,
  } = options

  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const executeWithRetry = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      let lastError: Error | null = null

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            setIsRetrying(true)
            setRetryCount(attempt)
            onRetry?.(attempt)

            // Aguardar antes de tentar novamente (exponential backoff)
            const delay = retryDelay * Math.pow(2, attempt - 1)
            await new Promise(resolve => {
              retryTimeoutRef.current = setTimeout(resolve, delay)
            })
          }

          const result = await fn(...args)
          
          // Sucesso - resetar estado
          setIsRetrying(false)
          setRetryCount(0)
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current)
          }

          return result
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          // Se não é a última tentativa, continuar loop
          if (attempt < maxRetries) {
            continue
          }

          // Última tentativa falhou
          setIsRetrying(false)
          setRetryCount(0)
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current)
          }
          onMaxRetriesReached?.()
          throw lastError
        }
      }

      throw lastError || new Error('Max retries reached')
    },
    [fn, maxRetries, retryDelay, onRetry, onMaxRetriesReached]
  )

  const cancel = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    setIsRetrying(false)
    setRetryCount(0)
  }, [])

  return {
    execute: executeWithRetry,
    isRetrying,
    retryCount,
    cancel,
  }
}

