'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { AlertCircle, Lock, CheckCircle2 } from 'lucide-react'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: 'A nova senha deve ser diferente da senha atual',
  path: ['newPassword'],
})

type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export default function AlterarSenhaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [mustChange, setMustChange] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })

  useEffect(() => {
    checkMustChangePassword()
  }, [])

  const checkMustChangePassword = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.must_change_password) {
      setMustChange(true)
    } else {
      // Se não precisa alterar, redireciona
      router.push('/portal/dashboard')
    }
  }

  const onSubmit = async (data: ChangePasswordInput) => {
    try {
      setLoading(true)

      // Verificar senha atual fazendo login novamente
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        throw new Error('Usuário não encontrado')
      }

      // Tentar fazer login com a senha atual para verificar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      })

      if (signInError) {
        throw new Error('Senha atual incorreta')
      }

      // Alterar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      })

      if (updateError) throw updateError

      // Atualizar metadata para remover must_change_password
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          must_change_password: false,
        },
      })

      if (metadataError) {
        console.warn('Erro ao atualizar metadata:', metadataError)
        // Não bloqueia se falhar, apenas avisa
      }

      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Sua senha foi atualizada. Redirecionando...',
      })

      // Aguardar um pouco e redirecionar
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/portal/dashboard')
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar senha',
        description: error.message || 'Não foi possível alterar a senha',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!mustChange) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Verificando...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-3">
              <Lock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Alterar Senha</CardTitle>
          <CardDescription className="text-center">
            Por segurança, você precisa alterar sua senha padrão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta é sua primeira vez fazendo login. Por favor, altere sua senha padrão para uma senha segura.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual (Senha Padrão) *</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Digite a senha padrão recebida"
                {...register('currentPassword')}
              />
              {errors.currentPassword && (
                <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use a senha padrão que foi fornecida quando seu cadastro foi criado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha *</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                A senha deve ter no mínimo 6 caracteres.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Lock className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Alterar Senha
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

