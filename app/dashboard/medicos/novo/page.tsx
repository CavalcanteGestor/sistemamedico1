'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { doctorSchema, type DoctorInput } from '@/lib/validations/doctor'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NovoMedicoPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [testingMessage, setTestingMessage] = useState(false)
  const [specialties, setSpecialties] = useState<any[]>([])
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DoctorInput>({
    resolver: zodResolver(doctorSchema),
  })

  const specialtyId = watch('specialty_id')

  useEffect(() => {
    loadSpecialties()
  }, [])

  const loadSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .order('name')

      if (error) throw error
      setSpecialties(data || [])
    } catch (error) {
      console.error('Erro ao carregar especialidades:', error)
    }
  }

  const onSubmit = async (data: DoctorInput) => {
    try {
      setLoading(true)
      
      // Chamar API para criar médico com login
      const response = await fetch('/api/doctors/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          password: watch('password') || undefined, // Senha opcional (será gerada automaticamente se não fornecida)
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar médico')
      }

      // Mostrar mensagem apropriada baseada em como foi criado
      let description = 'O médico foi cadastrado no sistema.'
      if (result.emailSent) {
        description = 'O médico foi cadastrado com sucesso! Um email foi enviado para ele com um link para definir sua própria senha.'
      } else if (result.credentials?.password) {
        description = `O médico foi cadastrado com sucesso!\n\nCredenciais de acesso:\nEmail: ${result.credentials.email}\nSenha: ${result.credentials.password}\n\nO médico deve alterar a senha no primeiro acesso.`
      }

      toast({
        title: 'Médico criado com sucesso!',
        description,
        duration: result.emailSent ? 8000 : 10000, // Mostrar por mais tempo se tiver credenciais
      })

      router.push('/dashboard/medicos')
    } catch (error: any) {
      toast({
        title: 'Erro ao criar médico',
        description: error.message || 'Não foi possível criar o médico',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link href="/dashboard/medicos">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Novo Médico</CardTitle>
          <CardDescription>
            Preencha os dados do médico
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
                <Label htmlFor="crm">CRM *</Label>
                <Input id="crm" {...register('crm')} />
                {errors.crm && (
                  <p className="text-sm text-destructive">{errors.crm.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty_id">Especialidade *</Label>
              <Select
                value={specialtyId}
                onValueChange={(value) => setValue('specialty_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a especialidade" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.specialty_id && (
                <p className="text-sm text-destructive">{errors.specialty_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input id="phone" {...register('phone')} />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register('email')} />
                <p className="text-xs text-muted-foreground">
                  Será usado como login do médico no sistema
                </p>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha Inicial (opcional - apenas se não quiser enviar email)</Label>
              <Input 
                id="password" 
                type="password" 
                {...register('password')} 
                placeholder="Deixe em branco para enviar email de convite"
              />
              <p className="text-xs text-muted-foreground">
                <strong>Recomendado:</strong> Deixe em branco. Um email será enviado para o médico com um link para ele definir sua própria senha.
                <br />
                Se você definir uma senha aqui, o médico poderá usar essa senha diretamente, mas não receberá o email de convite.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone">
                Telefone WhatsApp (para notificações de agendamentos)
              </Label>
              <div className="flex gap-2">
                <Input 
                  id="whatsapp_phone" 
                  placeholder="5599999999@s.whatsapp.net ou apenas números"
                  className="flex-1"
                  {...register('whatsapp_phone')} 
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const whatsappPhone = watch('whatsapp_phone')
                    if (!whatsappPhone) {
                      toast({
                        title: 'Telefone necessário',
                        description: 'Por favor, preencha o telefone WhatsApp primeiro.',
                        variant: 'destructive',
                      })
                      return
                    }

                    try {
                      setTestingMessage(true)
                      
                      // Formatar telefone
                      let formattedPhone = whatsappPhone
                      if (!formattedPhone.includes('@s.whatsapp.net')) {
                        const cleaned = formattedPhone.replace(/\D/g, '')
                        if (cleaned.length >= 10) {
                          formattedPhone = `${cleaned}@s.whatsapp.net`
                        } else {
                          throw new Error('Telefone inválido')
                        }
                      }

                      // Enviar mensagem de teste (não deve ativar atendimento humano)
                      const response = await fetch('/api/whatsapp/send', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          phone: formattedPhone,
                          message: '✅ *Mensagem de Teste*\n\nEste é um teste do sistema de notificações. Se você recebeu esta mensagem, o número está configurado corretamente!',
                          isTest: true, // Flag para não ativar atendimento humano
                        }),
                      })

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}))
                        throw new Error(errorData.error || 'Erro ao enviar mensagem de teste')
                      }

                      toast({
                        title: '✅ Mensagem enviada com sucesso!',
                        description: 'A mensagem de teste foi enviada. O número WhatsApp será salvo quando você criar o médico e poderá ser alterado pelo médico quando ele fizer login.',
                        duration: 6000, // Mostrar por 6 segundos para dar tempo de ler
                      })
                    } catch (error: any) {
                      toast({
                        title: 'Erro ao enviar teste',
                        description: error.message || 'Não foi possível enviar a mensagem de teste.',
                        variant: 'destructive',
                      })
                    } finally {
                      setTestingMessage(false)
                    }
                  }}
                  disabled={testingMessage || !watch('whatsapp_phone')}
                >
                  {testingMessage ? 'Enviando...' : 'Testar Mensagem'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Número WhatsApp para receber notificações quando novos agendamentos forem criados. 
                Formato: 5599999999@s.whatsapp.net ou apenas números (será formatado automaticamente).
                Use o botão "Testar Mensagem" para verificar se o número está correto.
              </p>
              {errors.whatsapp_phone && (
                <p className="text-sm text-destructive">{errors.whatsapp_phone.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                {...register('active')}
                defaultChecked
                className="rounded"
              />
              <Label htmlFor="active">Médico ativo</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Médico'}
              </Button>
              <Link href="/dashboard/medicos">
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

