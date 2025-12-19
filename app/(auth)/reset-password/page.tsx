'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Eye, EyeOff, UserPlus, Shield } from 'lucide-react'

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isFirstTime, setIsFirstTime] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    // Verificar se usuário está autenticado (após verificar token via /auth/confirm)
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setIsAuthenticated(true)
        setError('') // Limpar erro se autenticado
        
        // Buscar role do usuário para redirecionamento correto
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profile?.role) {
          setUserRole(profile.role)
          
          // Verificar se é primeira vez (usuário sem senha definida ou metadata indica)
          if (user.user_metadata?.must_change_password || !user.email_confirmed_at) {
            setIsFirstTime(true)
          }
        }
      } else {
        setIsAuthenticated(false)
        const token = searchParams?.get('token_hash')
        const type = searchParams?.get('type')
        
        // Se houver token na URL mas não está autenticado, redirecionar para /auth/confirm
        if (token && type === 'recovery') {
          router.push(`/auth/confirm?token_hash=${token}&type=${type}`)
          return
        }
        
        setError('Link inválido ou expirado. Solicite um novo link de recuperação.')
      }
    }

    checkAuth()
  }, [searchParams, router])

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      setLoading(true)
      setError('')
      const supabase = createClient()

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (updateError) throw updateError

      toast({
        title: 'Senha definida com sucesso!',
        description: isFirstTime 
          ? 'Bem-vindo ao sistema! Redirecionando...'
          : 'Sua senha foi atualizada. Redirecionando...',
      })

      // Aguardar um pouco e redirecionar baseado no role
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Redirecionar baseado no role do usuário
      if (userRole === 'medico') {
        router.push('/dashboard/medico')
      } else if (userRole === 'admin' || userRole === 'desenvolvedor') {
        router.push('/dashboard')
      } else if (userRole === 'recepcionista') {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Erro ao redefinir senha. Tente novamente.')
      toast({
        title: 'Erro ao redefinir senha',
        description: error.message || 'Não foi possível redefinir a senha',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading enquanto verifica autenticação
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
              <p className="text-muted-foreground font-medium">Verificando link de recuperação...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Se não estiver autenticado, mostrar erro
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Link Inválido
            </CardTitle>
            <CardDescription>
              O link de recuperação de senha é inválido ou expirou
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || 'Você precisa usar o link enviado por email para redefinir sua senha.'}</AlertDescription>
            </Alert>
            <Link href="/forgot-password">
              <Button variant="outline" className="w-full">
                Solicitar Novo Link
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full">Voltar ao Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-2">
            {isFirstTime ? (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl text-center">
            {isFirstTime ? 'Bem-vindo ao Sistema!' : 'Redefinir Senha'}
          </CardTitle>
          <CardDescription className="text-center">
            {isFirstTime 
              ? 'Defina sua senha para começar a usar o sistema'
              : 'Digite sua nova senha abaixo'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  {...register('password')}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Digite a senha novamente"
                  {...register('confirmPassword')}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? (isFirstTime ? 'Configurando...' : 'Redefinindo...')
                : (isFirstTime ? 'Definir Senha e Entrar' : 'Redefinir Senha')
              }
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                Voltar ao login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
