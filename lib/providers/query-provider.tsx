'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tempo que os dados são considerados "frescos"
            staleTime: 60 * 1000, // 1 minuto
            // Tempo que os dados ficam em cache
            gcTime: 5 * 60 * 1000, // 5 minutos (antes era cacheTime)
            // Retry automático em caso de erro
            retry: 1,
            // Refetch quando a janela ganha foco
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

