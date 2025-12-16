'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function ConfigurarContaPage() {
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)
      
      // Tentar vincular automaticamente
      await tryLinkPatient(currentUser)
    } catch (error) {
      console.error('Erro ao verificar usuário:', error)
    } finally {
      setLoading(false)
    }
  }

  const tryLinkPatient = async (userData: any) => {
    try {
      setLinking(true)
      
      // Chamar API para tentar vincular
      const response = await fetch('/api/portal/link-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: 'Conta configurada!',
          description: 'Sua conta foi vinculada ao paciente com sucesso.',
        })
        
        // Aguardar um pouco e redirecionar
        await new Promise(resolve => setTimeout(resolve, 1000))
        router.push('/portal/dashboard')
        router.refresh()
      } else {
        console.error('Erro ao vincular:', result.error)
      }
    } catch (error: any) {
      console.error('Erro ao tentar vincular:', error)
    } finally {
      setLinking(false)
    }
  }

  const handleRetry = async () => {
    if (user) {
      await tryLinkPatient(user)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Configuração Necessária
          </CardTitle>
          <CardDescription>
            Sua conta precisa ser vinculada a um registro de paciente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Conta não vinculada</AlertTitle>
            <AlertDescription>
              Sua conta de usuário ({user?.email}) não está vinculada a nenhum paciente no sistema.
              Isso geralmente acontece quando você fez login antes de ter um registro de paciente criado.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-semibold">O que fazer:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Entre em contato com a clínica para criar seu registro de paciente</li>
              <li>Ou aguarde - tentaremos vincular automaticamente quando o registro for criado</li>
              <li>Se você acabou de fazer login pelo link enviado, aguarde alguns instantes e tente novamente</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleRetry} 
              disabled={linking}
              className="flex-1"
            >
              {linking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tentando...
                </>
              ) : (
                'Tentar Vincular Novamente'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            >
              Sair
            </Button>
          </div>

          {user?.email && (
            <div className="pt-4 border-t text-xs text-muted-foreground">
              <p><strong>Email da conta:</strong> {user.email}</p>
              <p><strong>ID do usuário:</strong> {user.id.substring(0, 8)}...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

