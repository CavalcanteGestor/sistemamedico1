'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const passwordSchema = z.object({
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
})

type PasswordInput = z.infer<typeof passwordSchema>

function PatientLoginContent() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<any>(null)
  const [changingPassword, setChangingPassword] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
  })


  useEffect(() => {
    if (token) {
      verifyToken()
    }
  }, [token])

  const createUserForPatient = async (patient: any) => {
    try {
      console.log('Criando usuário para paciente:', patient.id)
      
      // Criar usuário via API
      const response = await fetch('/api/auth/create-user-for-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: patient.id,
          email: patient.email,
          name: patient.name,
        }),
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Resposta não é JSON:', text.substring(0, 200))
        throw new Error('Resposta inválida do servidor')
      }

      const result = await response.json()
      console.log('Resultado da criação:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário')
      }

      return result
    } catch (error: any) {
      console.error('Erro ao criar usuário para paciente:', error)
      throw error
    }
  }

  const verifyToken = async () => {
    try {
      setLoading(true)

      // Verificando token

      // Buscar paciente pelo token
      // A política RLS permite buscar por login_token mesmo sem autenticação
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, email, user_id, login_token, login_token_expires_at, cpf, phone')
        .eq('login_token', token)
        .single()

      console.log('Resultado da busca:', { data, error })
      console.log('Data completo:', JSON.stringify(data, null, 2))

      if (error) {
        console.error('Erro ao buscar paciente:', error)
        console.error('Código do erro:', error.code)
        console.error('Mensagem do erro:', error.message)
        
        // Se o erro é que não encontrou nenhum resultado (PGRST116)
        if (error.code === 'PGRST116' || error.message?.includes('0 rows') || error.message?.includes('Cannot coerce')) {
          toast({
            title: 'Link não encontrado',
            description: 'Este link de login não foi encontrado no sistema. O link pode ter sido gerado incorretamente ou o paciente pode precisar de um novo link.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Erro ao validar link',
            description: error.message || 'Não foi possível validar o link. Tente novamente ou entre em contato com a clínica.',
            variant: 'destructive',
          })
        }
        return
      }

      if (!data || !data.id) {
        console.warn('Dados do paciente não encontrados ou inválidos:', data)
        toast({
          title: 'Link inválido',
          description: 'Este link de login não foi encontrado. Verifique se o link está correto ou solicite um novo link à clínica.',
          variant: 'destructive',
        })
        return
      }

      // Verificar se o token não expirou
      if (data.login_token_expires_at) {
        const expiresAt = new Date(data.login_token_expires_at)
        if (expiresAt < new Date()) {
          toast({
            title: 'Link expirado',
            description: 'Este link de login expirou. Entre em contato com a clínica para gerar um novo link.',
            variant: 'destructive',
          })
          return
        }
      }

      // Verificar se o paciente tem user_id
      // Se não tiver, precisamos criar o usuário primeiro
      if (!data.user_id) {
        console.log('Paciente sem user_id, criando usuário...')
        
        toast({
          title: 'Configurando sua conta...',
          description: 'Criando sua conta de acesso ao portal. Isso pode levar alguns segundos.',
        })
        
        const result = await createUserForPatient(data)
        
        if (!result || !result.success) {
          throw new Error(result?.error || 'Erro ao criar conta de usuário')
        }
        
        // Aguardar um pouco para garantir que o banco foi atualizado
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Recarregar dados do paciente após criar usuário
        const { data: updatedPatient, error: reloadError } = await supabase
          .from('patients')
          .select('id, name, email, user_id, login_token, login_token_expires_at, cpf, phone')
          .eq('id', data.id)
          .single()
        
        if (reloadError) {
          console.error('Erro ao recarregar paciente:', reloadError)
          // Mesmo com erro, tentar continuar com os dados originais + userId da resposta
          if (result.userId) {
            setPatient({
              ...data,
              user_id: result.userId,
            })
          } else {
            throw new Error('Não foi possível recarregar dados do paciente')
          }
        } else if (updatedPatient && updatedPatient.user_id) {
          setPatient(updatedPatient)
          console.log('Usuário criado e paciente atualizado:', updatedPatient.name)
          toast({
            title: 'Conta criada com sucesso!',
            description: 'Agora defina sua senha para continuar.',
          })
        } else {
          // Se ainda não tem user_id, tentar usar o userId da resposta
          if (result.userId) {
            setPatient({
              ...data,
              user_id: result.userId,
            })
            toast({
              title: 'Conta criada com sucesso!',
              description: 'Agora defina sua senha para continuar.',
            })
          } else {
            throw new Error('Não foi possível criar a conta de usuário')
          }
        }
      } else {
        setPatient(data)
        console.log('Paciente encontrado:', data.name)
      }
    } catch (error: any) {
      console.error('Erro ao verificar token:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao validar o link de login. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const onChangePassword = async (data: PasswordInput) => {
    try {
      setChangingPassword(true)

      // Primeiro fazer login com senha padrão
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: patient.email,
        password: 'paciente123', // Senha padrão
      })

      if (authError) {
        throw new Error('Não foi possível validar as credenciais. Entre em contato com a clínica.')
      }

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
        data: {
          must_change_password: false,
        },
      })

      if (updateError) throw updateError

      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Redirecionando para o portal do paciente...',
      })

      // Aguardar um pouco para garantir que a sessão foi salva
      await new Promise(resolve => setTimeout(resolve, 500))

      router.push('/portal/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error)
      toast({
        title: 'Erro ao alterar senha',
        description: error.message || 'Não foi possível alterar a senha. Entre em contato com a clínica.',
        variant: 'destructive',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Verificando link...</CardTitle>
            <CardDescription>
              Aguarde enquanto validamos seu link de acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Link Inválido</CardTitle>
            <CardDescription>
              Não foi possível validar seu link de acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verifique se você copiou o link completo ou entre em contato com a clínica.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
                Tentar Novamente
              </Button>
              <Button variant="default" onClick={() => router.push('/login')} className="flex-1">
                Ir para Login
              </Button>
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
          <CardTitle className="text-2xl flex items-center gap-2">
            <User className="h-6 w-6" />
            Bem-vindo!
          </CardTitle>
          <CardDescription>
            Olá, <strong>{patient.name}</strong>! Este é seu primeiro acesso ao portal do paciente. 
            Por favor, defina uma senha para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                {...registerPassword('password')}
                placeholder="Mínimo 6 caracteres"
              />
              {passwordErrors.password && (
                <p className="text-sm text-destructive">{passwordErrors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...registerPassword('confirmPassword')}
                placeholder="Digite a senha novamente"
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configurando sua conta...
                </>
              ) : (
                'Criar Senha e Entrar'
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Se você já possui uma senha,{' '}
              <a href="/login" className="text-primary underline">
                faça login normalmente aqui
              </a>
              .
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PatientLoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PatientLoginContent />
    </Suspense>
  )
}

