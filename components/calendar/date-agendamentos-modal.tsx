'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Clock, User, Stethoscope, MapPin, Video, Phone } from 'lucide-react'
import Link from 'next/link'

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  consultation_type: string
  notes?: string
  room_id?: string
  patients?: {
    id: string
    name: string
  }
  doctors?: {
    id: string
    name: string
    crm: string
  }
  clinic_rooms?: {
    id: string
    name: string
  }
}

interface DateAgendamentosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  onRefresh?: () => void
}

export function DateAgendamentosModal({
  open,
  onOpenChange,
  date,
  onRefresh,
}: DateAgendamentosModalProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [rooms, setRooms] = useState<any[]>([])

  useEffect(() => {
    if (open && date) {
      loadAppointments()
      loadRooms()
    }
  }, [open, date])

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('clinic_rooms')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) throw error
      setRooms(data || [])
    } catch (error) {
      console.error('Erro ao carregar salas:', error)
    }
  }

  const loadAppointments = async () => {
    if (!date) return

    try {
      setLoading(true)
      const dateStr = format(date, 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients:patient_id (
            id,
            name
          ),
          doctors:doctor_id (
            id,
            name,
            crm
          ),
          clinic_rooms:room_id (
            id,
            name
          )
        `)
        .eq('appointment_date', dateStr)
        .order('appointment_time', { ascending: true })

      if (error) throw error
      setAppointments(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar agendamentos:', error)
      toast({
        title: 'Erro ao carregar agendamentos',
        description: error.message || 'Não foi possível carregar os agendamentos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      scheduled: { label: 'Agendada', variant: 'default' },
      confirmed: { label: 'Confirmada', variant: 'default' },
      completed: { label: 'Concluída', variant: 'secondary' },
      cancelled: { label: 'Cancelada', variant: 'destructive' },
      no_show: { label: 'Falta', variant: 'outline' },
    }

    const config = statusConfig[status] || { label: status, variant: 'outline' }
    return (
      <Badge variant={config.variant}>{config.label}</Badge>
    )
  }

  const getConsultationTypeIcon = (type: string) => {
    switch (type) {
      case 'telemedicina':
        return <Video className="h-4 w-4" />
      case 'hibrida':
        return <Phone className="h-4 w-4" />
      default:
        return <MapPin className="h-4 w-4" />
    }
  }

  const dateStr = date ? format(date, 'yyyy-MM-dd') : ''
  const formattedDate = date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendamentos do Dia</DialogTitle>
          <DialogDescription>
            {formattedDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Botão para adicionar novo agendamento */}
          <Link href={`/dashboard/agendamentos/novo?date=${dateStr}`}>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </Link>

          {/* Lista de agendamentos */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando agendamentos...
            </div>
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum agendamento para este dia.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-lg">
                            {appointment.appointment_time}
                          </span>
                          {getStatusBadge(appointment.status)}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {appointment.patients?.name || 'Paciente não encontrado'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Stethoscope className="h-4 w-4" />
                          <span>
                            {appointment.doctors?.name || 'Médico não encontrado'}
                            {appointment.doctors?.crm && ` - CRM: ${appointment.doctors.crm}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {getConsultationTypeIcon(appointment.consultation_type)}
                          <span className="capitalize">{appointment.consultation_type}</span>
                        </div>

                        {appointment.clinic_rooms && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>Sala: {appointment.clinic_rooms.name}</span>
                          </div>
                        )}

                        {appointment.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {appointment.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link href={`/dashboard/agendamentos/${appointment.id}/editar`}>
                          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            Editar
                          </Button>
                        </Link>
                        <Link href={`/dashboard/pacientes/${appointment.patients?.id}`}>
                          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                            Ver Paciente
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

