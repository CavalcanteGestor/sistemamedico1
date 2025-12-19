'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
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

function EditarAgendamentoContent() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [appointment, setAppointment] = useState<any>(null)
  const supabase = createClient()
  const appointmentId = params?.id as string

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
  })

  const consultationType = watch('consultation_type')
  const roomIdRaw = watch('room_id')
  const roomId = roomIdRaw === null || roomIdRaw === undefined || roomIdRaw === '' ? 'none' : roomIdRaw
  const appointmentDate = watch('appointment_date')
  const appointmentTime = watch('appointment_time')

  useEffect(() => {
    if (appointmentId) {
      loadData()
    }
  }, [appointmentId])

  const loadData = async () => {
    try {
      setLoadingData(true)

      // Carregar pacientes, médicos, salas e agendamento
      const { getAvailableDoctors } = await import('@/lib/utils/doctor-helpers')
      const doctorsData = await getAvailableDoctors(supabase, { active: true })
      
      const [patientsRes, roomsRes, appointmentRes] = await Promise.all([
        supabase.from('patients').select('id, name').order('name'),
        supabase.from('clinic_rooms').select('id, name, description').eq('active', true).order('name'),
        supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single(),
      ])

      if (patientsRes.error) throw patientsRes.error
      if (roomsRes.error) throw roomsRes.error
      if (appointmentRes.error) throw appointmentRes.error

      setPatients(patientsRes.data || [])
      setDoctors(doctorsData.map(d => ({ id: d.id, name: d.name, crm: d.crm })))
      setRooms(roomsRes.data || [])
      setAppointment(appointmentRes.data)

      // Preencher o formulário com os dados do agendamento
      if (appointmentRes.data) {
        const apt = appointmentRes.data
        setValue('patient_id', apt.patient_id)
        setValue('doctor_id', apt.doctor_id)
        setValue('appointment_date', apt.appointment_date)
        setValue('appointment_time', apt.appointment_time)
        setValue('consultation_type', apt.consultation_type || 'presencial')
        setValue('room_id', apt.room_id ? apt.room_id : 'none')
        setValue('notes', apt.notes || '')
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: 'Erro ao carregar agendamento',
        description: error.message || 'Não foi possível carregar os dados do agendamento',
        variant: 'destructive',
      })
      router.push('/dashboard/agendamentos')
    } finally {
      setLoadingData(false)
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
        .neq('id', appointmentId) // Excluir o próprio agendamento sendo editado
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
      const finalRoomId = data.room_id === 'none' || !data.room_id ? null : data.room_id
      if (finalRoomId) {
        const hasConflict = await checkRoomConflict(
          finalRoomId,
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

      // Atualizar agendamento
      const { error } = await supabase
        .from('appointments')
        .update({
          patient_id: data.patient_id,
          doctor_id: data.doctor_id,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          consultation_type: data.consultation_type,
          room_id: finalRoomId,
          notes: data.notes,
        })
        .eq('id', appointmentId)

      if (error) throw error

      toast({
        title: 'Agendamento atualizado com sucesso!',
        description: 'As alterações foram salvas no sistema.',
      })

      router.push('/dashboard/agendamentos')
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar agendamento',
        description: error.message || 'Não foi possível atualizar o agendamento',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium">Carregando agendamento...</p>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Agendamento não encontrado</p>
        <Link href="/dashboard/agendamentos">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    )
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
          <CardTitle>Editar Agendamento</CardTitle>
          <CardDescription>
            Atualize os dados do agendamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient_id">Paciente *</Label>
              <Select
                value={watch('patient_id')}
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
                value={watch('doctor_id')}
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
                  value={roomId}
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
                  {roomId && roomId !== 'none' && appointmentDate && appointmentTime
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
                {loading ? 'Salvando...' : 'Salvar Alterações'}
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

export default function EditarAgendamentoPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <EditarAgendamentoContent />
    </Suspense>
  )
}

