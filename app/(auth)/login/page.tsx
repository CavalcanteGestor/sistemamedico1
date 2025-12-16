'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Mail, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [checkingUser, setCheckingUser] = useState(false)
  const [userExists, setUserExists] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const email = watch('email')
  const errorParam = searchParams?.get('error')

  // Verificar erros no hash da URL (vindo do Supabase quando token expira)
  useEffect(() => {
    // Ler hash da URL (ex: #error=access_denied&error_code=otp_expired)
    const hash = window.location.hash.substring(1) // Remove o #
    if (hash) {
      const params = new URLSearchParams(hash)
      const hashError = params.get('error')
      const errorCode = params.get('error_code')
      const errorDescription = params.get('error_description')

      // Se for erro de OTP expirado (link de recuperação expirado)
      if (hashError === 'access_denied' && errorCode === 'otp_expired') {
        // Limpar hash da URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        
        // Redirecionar para forgot-password com mensagem
        const message = errorDescription || 'Link de recuperação expirado. Solicite um novo link.'
        router.push(`/forgot-password?error=expired&message=${encodeURIComponent(message)}`)
        return
      }

      // Outros erros de token podem ser tratados aqui
      if (hashError && errorCode) {
        // Limpar hash da URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        
        toast({
          title: 'Erro de autenticação',
          description: errorDescription || 'Token inválido ou expirado. Tente novamente.',
          variant: 'destructive',
        })
      }
    }
  }, [router, toast])

  // Verificar se usuário existe quando digita o email (mais simples e eficiente)
  useEffect(() => {
    const checkUserExists = async () => {
      if (!email || email.length < 5 || !email.includes('@')) {
        setUserExists(null)
        setErrorMessage('')
        return
      }

      setCheckingUser(true)
      setErrorMessage('')
      
      try {
        // Usar uma API route para verificar se o usuário existe
        // Isso evita tentativas de login com senha incorreta
        const response = await fetch(`/api/auth/check-user?email=${encodeURIComponent(email)}`)
        const data = await response.json()
        
        if (data.exists) {
          setUserExists(true)
          if (data.emailNotConfirmed) {
            setErrorMessage('Email não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.')
          } else {
            setErrorMessage('')
          }
        } else {
          setUserExists(false)
          setErrorMessage('Usuário não encontrado com este email.')
        }
      } catch (err) {
        // Em caso de erro, não mostrar nada (pode ser problema de rede)
        setUserExists(null)
        setErrorMessage('')
      } finally {
        setCheckingUser(false)
      }
    }

    const timeoutId = setTimeout(checkUserExists, 800) // Debounce
    return () => clearTimeout(timeoutId)
  }, [email])

  const onSubmit = async (data: LoginInput) => {
    try {
      setLoading(true)
      setErrorMessage('')
      const supabase = createClient()

      // Salvar preferência de "Manter conectado" no localStorage
      if (data.rememberMe) {
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.setItem('rememberMe', 'false')
        // Se não marcar, configurar para fazer logout ao fechar aba
        sessionStorage.setItem('sessionOnly', 'true')
      }

      // Primeiro, verificar se o usuário existe
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        // Tratamento específico de erros
        let errorMsg = 'Erro ao fazer login'
        
        if (error.message.includes('Email not confirmed')) {
          errorMsg = 'Seu email ainda não foi confirmado. Verifique sua caixa de entrada e clique no link de confirmação.'
          setErrorMessage(errorMsg)
        } else if (error.message.includes('Invalid login credentials')) {
          errorMsg = 'Email ou senha incorretos. Verifique suas credenciais.'
          setErrorMessage(errorMsg)
        } else if (error.message.includes('Invalid email')) {
          errorMsg = 'Email inválido. Verifique o formato do email.'
          setErrorMessage(errorMsg)
        } else {
          errorMsg = error.message || 'Credenciais inválidas'
          setErrorMessage(errorMsg)
        }

        throw new Error(errorMsg)
      }

      if (!signInData.user) {
        throw new Error('Falha ao autenticar. Tente novamente.')
      }

      // Verificar se o perfil existe, se não, criar
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', signInData.user.id)
        .single()

      if (!profile) {
        // Criar perfil se não existir
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: signInData.user.id,
            email: signInData.user.email!,
            name: signInData.user.user_metadata?.name || signInData.user.email?.split('@')[0] || 'Usuário',
            role: signInData.user.user_metadata?.role || 'paciente',
          })

        if (profileError && !profileError.message.includes('duplicate')) {
          console.error('Erro ao criar perfil:', profileError)
        }
      }

      // Verificar se precisa alterar senha
      const mustChangePassword = signInData.user.user_metadata?.must_change_password === true

      // Redirecionar baseado no role
      const userRole = profile?.role || signInData.user.user_metadata?.role || 'paciente'
      
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Redirecionando...',
      })

      // Aguardar um pouco para garantir que a sessão foi salva
      await new Promise(resolve => setTimeout(resolve, 300))

      // Redirecionar baseado no role - cada role tem seu próprio dashboard
      if (userRole === 'paciente' && mustChangePassword) {
        router.push('/portal/alterar-senha')
      } else if (userRole === 'paciente') {
        router.push('/portal/dashboard')
      } else if (userRole === 'medico') {
        router.push('/dashboard/medico')
      } else if (userRole === 'admin') {
        router.push('/dashboard/admin')
      } else if (userRole === 'recepcionista') {
        router.push('/dashboard/recepcionista')
      } else if (userRole === 'desenvolvedor') {
        router.push('/dashboard/desenvolvedor')
      } else {
        // Fallback para dashboard padrão
        router.push('/dashboard')
      }
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer login',
        description: error.message || 'Credenciais inválidas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(errorParam === 'invalid_token' || errorParam === 'access_denied') && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorParam === 'access_denied' 
                  ? 'Link de recuperação expirado. Solicite um novo link clicando em "Esqueceu a senha?".'
                  : 'Token de confirmação inválido ou expirado. Tente fazer login novamente ou solicite um novo email de confirmação.'
                }
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant={userExists === false ? "destructive" : "default"} className="mb-4">
              {userExists === false ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  className={userExists === false ? 'border-destructive' : userExists === true ? 'border-green-500' : ''}
                />
                {checkingUser && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!checkingUser && userExists === true && (
                  <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                )}
                {!checkingUser && userExists === false && (
                  <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                )}
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
              {userExists === false && email && email.length > 5 && !checkingUser && (
                <p className="text-sm text-destructive">
                  Usuário não encontrado. Entre em contato com o administrador do sistema para criar uma conta.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary transition-colors hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading || checkingUser}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Carregando...</div>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

