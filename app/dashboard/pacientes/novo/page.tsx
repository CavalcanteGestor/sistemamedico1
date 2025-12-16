'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientSchema, type PatientInput } from '@/lib/validations/patient'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NovoPacientePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientInput>({
    resolver: zodResolver(patientSchema),
  })

  const onSubmit = async (data: PatientInput) => {
    try {
      setLoading(true)

      // Criar paciente e usuário via API
      const response = await fetch('/api/patients/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar paciente')
      }

      // Mostrar credenciais de login
      const { loginCredentials } = result
      
      toast({
        title: 'Paciente criado com sucesso!',
        description: (
          <div className="space-y-2">
            <p>O paciente foi cadastrado e o login foi criado automaticamente.</p>
            <div className="mt-2 p-2 bg-muted rounded text-sm">
              <p><strong>Email/Login:</strong> {loginCredentials.email}</p>
              <p><strong>Senha padrão:</strong> {loginCredentials.password}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ O paciente precisará alterar a senha no primeiro login.
              </p>
            </div>
          </div>
        ),
        duration: 10000, // Mostra por 10 segundos
      })

      router.push('/dashboard/pacientes')
    } catch (error: any) {
      toast({
        title: 'Erro ao criar paciente',
        description: error.message || 'Não foi possível criar o paciente',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link href="/dashboard/pacientes">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Novo Paciente</CardTitle>
          <CardDescription>
            Preencha os dados do paciente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input id="cpf" {...register('cpf')} />
                {errors.cpf && (
                  <p className="text-sm text-destructive">{errors.cpf.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento *</Label>
                <Input id="birth_date" type="date" {...register('birth_date')} />
                {errors.birth_date && (
                  <p className="text-sm text-destructive">{errors.birth_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input id="phone" {...register('phone')} />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" {...register('address')} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" {...register('city')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" {...register('state')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input id="zip_code" {...register('zip_code')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Contato de Emergência</Label>
                <Input id="emergency_contact" {...register('emergency_contact')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_phone">Telefone de Emergência</Label>
                <Input id="emergency_phone" {...register('emergency_phone')} />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Paciente'}
              </Button>
              <Link href="/dashboard/pacientes">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

