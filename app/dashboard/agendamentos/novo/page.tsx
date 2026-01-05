'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { appointmentSchema, type AppointmentInput } from '@/lib/validations/appointment'
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

function NovoAgendamentoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const supabase = createClient()
  const tipoConsulta = searchParams.get('tipo')
  const dateParam = searchParams.get('date')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      consultation_type: tipoConsulta === 'telemedicina' ? 'telemedicina' : 'presencial',
    },
  })

  const patientId = watch('patient_id')
  const doctorId = watch('doctor_id')
  const consultationType = watch('consultation_type')
  const roomId = watch('room_id')
  const appointmentDate = watch('appointment_date')
  const appointmentTime = watch('appointment_time')

  useEffect(() => {
    loadData()
    if (tipoConsulta === 'telemedicina') {
      setValue('consultation_type', 'telemedicina')
    }
    if (dateParam) {
      setValue('appointment_date', dateParam)
    }
  }, [tipoConsulta, dateParam, setValue])

  const loadData = async () => {
    try {
      // Importar função helper para buscar médicos disponíveis
      const { getAvailableDoctors } = await import('@/lib/utils/doctor-helpers')
      
      const [patientsRes, doctorsData, roomsRes] = await Promise.all([
        supabase.from('patients').select('id, name').order('name'),
        getAvailableDoctors(supabase, { active: true }),
        supabase.from('clinic_rooms').select('id, name, description').eq('active', true).order('name'),
      ])
      
      // Formatar médicos para o formato esperado
      const doctorsRes = {
        data: doctorsData.map(d => ({
          id: d.id,
          name: d.name,
          crm: d.crm,
        })),
        error: null,
      }

      if (patientsRes.error) throw patientsRes.error
      if (doctorsRes.error) throw doctorsRes.error
      if (roomsRes.error) throw roomsRes.error

      setPatients(patientsRes.data || [])
      setDoctors(doctorsRes.data || [])
      setRooms(roomsRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const checkRoomConflict = async (roomId: string | null, date: string, time: string): Promise<boolean> => {
    if (!roomId) return false // Sem sala, não há conflito

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, patients:patient_id(name)')
        .eq('room_id', roomId)
        .eq('appointment_date', date)
        .eq('appointment_time', time)
        .in('status', ['scheduled', 'confirmed'])
        .maybeSingle()

      if (error) throw error
      return !!data
    } catch (error) {
      console.error('Erro ao verificar conflito de sala:', error)
      return false
    }
  }

  const onSubmit = async (data: AppointmentInput) => {
    try {
      setLoading(true)

      // Validar conflito de sala/horário se sala for selecionada
      if (data.room_id) {
        const hasConflict = await checkRoomConflict(
          data.room_id,
          data.appointment_date,
          data.appointment_time
        )

        if (hasConflict) {
          toast({
            title: 'Conflito de agendamento',
            description: 'Esta sala já está ocupada neste horário. Por favor, escolha outra sala ou outro horário.',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
      }

      // Buscar informações do usuário atual para rastreamento
      const { data: { user } } = await supabase.auth.getUser()
      let createdByUser = null
      let createdByRole = null
      let createdByName = null
      let createdByType = 'secretaria' // padrão

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, name')
          .eq('id', user.id)
          .single()

        if (profile) {
          createdByUser = user.id
          createdByRole = profile.role
          createdByName = profile.name
          
          // Determinar tipo baseado no role
          if (profile.role === 'admin') {
            createdByType = 'admin'
          } else if (profile.role === 'recepcionista') {
            createdByType = 'secretaria'
          }
        }
      }

      // Criar agendamento (tentar com campos de rastreamento primeiro)
      let appointment: any = null
      let error: any = null

      // Tentar inserir com campos de rastreamento (se a migração foi aplicada)
      const appointmentData: any = {
        ...data,
        room_id: data.room_id || null,
        status: 'scheduled',
      }

      // Adicionar campos de rastreamento se houver informações
      if (createdByUser || createdByRole || createdByName || createdByType) {
        appointmentData.created_by_user_id = createdByUser
        appointmentData.created_by_role = createdByRole
        appointmentData.created_by_name = createdByName
        appointmentData.created_by_type = createdByType
      }

      const result = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single()

      // Se der erro de coluna não encontrada, tentar novamente sem os campos de rastreamento
      if (result.error && result.error.message?.includes("created_by")) {
        console.warn('Campos de rastreamento não encontrados, criando agendamento sem eles. Aplique a migração 031.')
        const retryResult = await supabase
        .from('appointments')
        .insert({
          ...data,
          room_id: data.room_id || null,
          status: 'scheduled',
        })
        .select()
        .single()
        
        appointment = retryResult.data
        error = retryResult.error
      } else {
        appointment = result.data
        error = result.error
      }

      if (error) throw error

      // Criar lembretes automáticos (1 dia antes e 15 minutos antes)
      try {
        await fetch('/api/appointments/create-reminders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointmentId: appointment.id,
          }),
        })
      } catch (reminderError) {
        // Erro silencioso - não bloquear criação do agendamento
        console.error('Erro ao criar lembretes automáticos:', reminderError)
      }

      toast({
        title: 'Agendamento criado com sucesso!',
        description: 'O agendamento foi cadastrado no sistema. Lembretes automáticos foram configurados.',
      })

      // Se for telemedicina ou híbrida, criar sessão automaticamente
      if (
        data.consultation_type === 'telemedicina' ||
        data.consultation_type === 'hibrida'
      ) {
        try {
          const response = await fetch('/api/telemedicine/create-room', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              appointmentId: appointment.id,
              provider: 'webrtc',
            }),
          })

          if (response.ok) {
            toast({
              title: 'Sessão de telemedicina criada!',
              description: 'Redirecionando para a consulta...',
            })
            // Redirecionar para a sessão de telemedicina
            router.push(`/dashboard/consultas/detalhes/${appointment.id}`)
            return
          }
        } catch (telemedicineError) {
          console.error('Erro ao criar sessão de telemedicina:', telemedicineError)
          // Continua mesmo se falhar a criação da sessão
        }
      }

      router.push('/dashboard/agendamentos')
    } catch (error: any) {
      toast({
        title: 'Erro ao criar agendamento',
        description: error.message || 'Não foi possível criar o agendamento',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link href="/dashboard/agendamentos">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Novo Agendamento</CardTitle>
          <CardDescription>
            Preencha os dados do agendamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Paciente *</Label>
              <Select
                value={patientId}
                onValueChange={(value) => setValue('patient_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.patient_id && (
                <p className="text-sm text-destructive">{errors.patient_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor_id">Médico *</Label>
              <Select
                value={doctorId}
                onValueChange={(value) => setValue('doctor_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o médico" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name} - CRM: {doctor.crm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.doctor_id && (
                <p className="text-sm text-destructive">{errors.doctor_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appointment_date">Data *</Label>
                <Input
                  id="appointment_date"
                  type="date"
                  {...register('appointment_date')}
                />
                {errors.appointment_date && (
                  <p className="text-sm text-destructive">{errors.appointment_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="appointment_time">Horário *</Label>
                <Input
                  id="appointment_time"
                  type="time"
                  {...register('appointment_time')}
                />
                {errors.appointment_time && (
                  <p className="text-sm text-destructive">{errors.appointment_time.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consultation_type">Tipo de Consulta *</Label>
              <Select
                value={watch('consultation_type') || 'presencial'}
                onValueChange={(value) => setValue('consultation_type', value as 'presencial' | 'telemedicina' | 'hibrida')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="telemedicina">Telemedicina</SelectItem>
                  <SelectItem value="hibrida">Híbrida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(consultationType === 'presencial' || consultationType === 'hibrida') && (
              <div className="space-y-2">
                <Label htmlFor="room_id">Sala</Label>
                <Select
                  value={roomId || 'none'}
                  onValueChange={(value) => setValue('room_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma sala (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma sala</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} {room.description && `- ${room.description}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {roomId && appointmentDate && appointmentTime
                    ? 'Verificando disponibilidade da sala...'
                    : 'A sala será verificada ao salvar. Não é possível ter dois agendamentos na mesma sala no mesmo horário.'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input id="notes" {...register('notes')} />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Agendamento'}
              </Button>
              <Link href="/dashboard/agendamentos">
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

export default function NovoAgendamentoPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NovoAgendamentoContent />
    </Suspense>
  )
}
