'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Redirecionar imediatamente para login
    router.push('/login')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Registro Desabilitado</CardTitle>
          <CardDescription className="text-center">
            O registro público não está disponível
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Por questões de segurança, o registro de novas contas está disponível apenas para administradores do sistema.
              <br /><br />
              Se você precisa de uma conta, entre em contato com o administrador do sistema.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={() => router.push('/login')} 
            className="w-full"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

