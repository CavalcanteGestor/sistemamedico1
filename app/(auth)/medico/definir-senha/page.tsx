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
import { AlertCircle, Eye, EyeOff, UserPlus, CheckCircle2, Lock } from 'lucide-react'

const definePasswordSchema = z.object({
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
  confirmPassword: z.string().min(8, 'Confirmação de senha obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type DefinePasswordInput = z.infer<typeof definePasswordSchema>

function DefinirSenhaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [doctorName, setDoctorName] = useState<string>('')
  const [doctorEmail, setDoctorEmail] = useState<string>('')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<DefinePasswordInput>({
    resolver: zodResolver(definePasswordSchema),
  })

  const password = watch('password', '')

  // Verificar força da senha
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: '', color: '' }
    
    let strength = 0
    if (pwd.length >= 8) strength++
    if (pwd.length >= 12) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    
    if (strength <= 2) return { strength, label: 'Fraca', color: 'bg-red-500' }
    if (strength <= 4) return { strength, label: 'Média', color: 'bg-yellow-500' }
    return { strength, label: 'Forte', color: 'bg-green-500' }
  }

  const passwordStrength = getPasswordStrength(password)

  useEffect(() => {
    // Verificar se usuário está autenticado (após verificar token via /auth/confirm)
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (user && !authError) {
        setIsAuthenticated(true)
        setError('')
        setDoctorEmail(user.email || '')
        
        // Buscar nome do médico
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profile?.name) {
          setDoctorName(profile.name)
        }
        
        // Verificar se é médico
        if (profile?.role !== 'medico') {
          // Se não for médico, redirecionar para reset-password padrão
          router.push('/reset-password')
          return
        }
      } else {
        setIsAuthenticated(false)
        const token = searchParams?.get('token_hash')
        const type = searchParams?.get('type')
        
        // Se houver token na URL mas não está autenticado, redirecionar para /auth/confirm
        if (token && type === 'recovery') {
          router.push(`/auth/confirm?token_hash=${token}&type=${type}&next=/medico/definir-senha`)
          return
        }
        
        setError('Link inválido ou expirado. Entre em contato com a administração.')
      }
    }

    checkAuth()
  }, [searchParams, router])

  const onSubmit = async (data: DefinePasswordInput) => {
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
        description: 'Bem-vindo ao sistema! Redirecionando para o dashboard...',
      })

      // Aguardar um pouco e redirecionar para dashboard do médico
      await new Promise(resolve => setTimeout(resolve, 2000))
      router.push('/dashboard/medico')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Erro ao definir senha. Tente novamente.')
      toast({
        title: 'Erro ao definir senha',
        description: error.message || 'Não foi possível definir a senha',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading enquanto verifica autenticação
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
              <p className="text-muted-foreground font-medium">Verificando seu acesso...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Se não estiver autenticado, mostrar erro
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Link Inválido
            </CardTitle>
            <CardDescription>
              O link de acesso é inválido ou expirou
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Você precisa usar o link enviado por email para acessar esta página.'}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              Entre em contato com a administração da clínica para receber um novo link de acesso.
            </p>
            <Link href="/login">
              <Button className="w-full">Ir para Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <UserPlus className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">
              {doctorName ? `Bem-vindo, Dr(a). ${doctorName}!` : 'Bem-vindo ao Sistema!'}
            </CardTitle>
            <CardDescription className="mt-2">
              Configure sua senha de acesso para começar a usar o sistema
            </CardDescription>
          </div>
          {doctorEmail && (
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> {doctorEmail}
              </p>
            </div>
          )}
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
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres, com maiúscula, minúscula e número"
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
              
              {/* Indicador de força da senha */}
              {password && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Força:</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                      />
                    </div>
                    <span className={`font-medium ${
                      passwordStrength.strength <= 2 ? 'text-red-500' :
                      passwordStrength.strength <= 4 ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.
              </p>
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

            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Configurando acesso...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Definir Senha e Entrar
                </>
              )}
            </Button>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>🔒 Segurança:</strong> Sua senha será criptografada e armazenada com segurança. 
                Não compartilhe sua senha com ninguém.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DefinirSenhaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    }>
      <DefinirSenhaContent />
    </Suspense>
  )
}

