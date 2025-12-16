'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import {
  Calendar,
  FileText,
  Pill,
  FileSearch,
  Stethoscope,
  Camera,
  ArrowLeft,
  Download,
  Filter,
  Search,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TimelineEvent {
  id: string
  type: 'appointment' | 'prescription' | 'exam' | 'medical_record' | 'evolution' | 'photo' | 'document'
  date: string
  title: string
  description: string
  metadata?: any
  doctor?: string
}

export default function HistoricoPacientePage() {
  const params = useParams()
  const patientId = params.id as string
  const [patient, setPatient] = useState<any>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (patientId) {
      loadPatientHistory()
    }
  }, [patientId])

  useEffect(() => {
    filterEvents()
  }, [events, eventTypeFilter, searchTerm])

  const loadPatientHistory = async () => {
    try {
      setLoading(true)

      // Carregar dados do paciente
      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single()

      setPatient(patientData)

      const allEvents: TimelineEvent[] = []

      // Carregar agendamentos
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (name, crm)
        `)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false })

      appointments?.forEach((apt) => {
        allEvents.push({
          id: apt.id,
          type: 'appointment',
          date: `${apt.appointment_date}T${apt.appointment_time}`,
          title: `Consulta - ${new Date(apt.appointment_date).toLocaleDateString('pt-BR')} às ${apt.appointment_time}`,
          description: `Status: ${getAppointmentStatusLabel(apt.status)}${apt.notes ? ` - ${apt.notes}` : ''}`,
          metadata: apt,
          doctor: apt.doctors?.name,
        })
      })

      // Carregar prescrições
      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select(`
          *,
          doctors:doctor_id (name, crm)
        `)
        .eq('patient_id', patientId)
        .order('prescription_date', { ascending: false })

      prescriptions?.forEach((prescription) => {
        allEvents.push({
          id: prescription.id,
          type: 'prescription',
          date: `${prescription.prescription_date}T00:00:00`,
          title: `Prescrição Médica - ${new Date(prescription.prescription_date).toLocaleDateString('pt-BR')}`,
          description: prescription.notes || 'Prescrição médica',
          metadata: prescription,
          doctor: prescription.doctors?.name,
        })
      })

      // Carregar exames
      const { data: exams } = await supabase
        .from('exams')
        .select(`
          *,
          doctors:doctor_id (name, crm)
        `)
        .eq('patient_id', patientId)
        .order('exam_date', { ascending: false })

      exams?.forEach((exam) => {
        allEvents.push({
          id: exam.id,
          type: 'exam',
          date: `${exam.exam_date}T00:00:00`,
          title: `${exam.exam_type || 'Exame'} - ${new Date(exam.exam_date).toLocaleDateString('pt-BR')}`,
          description: `Status: ${getExamStatusLabel(exam.status)}${exam.notes ? ` - ${exam.notes}` : ''}`,
          metadata: exam,
          doctor: exam.doctors?.name,
        })
      })

      // Carregar prontuários
      const { data: medicalRecords } = await supabase
        .from('medical_records')
        .select(`
          *,
          doctors:doctor_id (name, crm),
          appointments:appointment_id (appointment_date)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      medicalRecords?.forEach((record) => {
        allEvents.push({
          id: record.id,
          type: 'medical_record',
          date: record.appointments?.appointment_date || record.created_at,
          title: `Prontuário Eletrônico - ${new Date(record.created_at).toLocaleDateString('pt-BR')}`,
          description: `Prontuário criado`,
          metadata: record,
          doctor: record.doctors?.name,
        })
      })

      // Carregar evoluções de todos os prontuários
      const medicalRecordIds = medicalRecords?.map((r) => r.id) || []
      if (medicalRecordIds.length > 0) {
        const { data: evolutions } = await supabase
          .from('evolutions')
          .select(`
            *,
            doctors:doctor_id (name, crm)
          `)
          .in('medical_record_id', medicalRecordIds)
          .order('evolution_date', { ascending: false })

        evolutions?.forEach((evolution) => {
          allEvents.push({
            id: evolution.id,
            type: 'evolution',
            date: `${evolution.evolution_date}T00:00:00`,
            title: `Evolução - ${new Date(evolution.evolution_date).toLocaleDateString('pt-BR')}`,
            description: evolution.notes.substring(0, 100) + (evolution.notes.length > 100 ? '...' : ''),
            metadata: evolution,
            doctor: evolution.doctors?.name,
          })
        })
      }

      // Ordenar eventos por data (mais recente primeiro)
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setEvents(allEvents)
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = () => {
    let filtered = events

    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter((event) => event.type === eventTypeFilter)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(search) ||
          event.description.toLowerCase().includes(search) ||
          event.doctor?.toLowerCase().includes(search)
      )
    }

    setFilteredEvents(filtered)
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return Calendar
      case 'prescription':
        return Pill
      case 'exam':
        return FileSearch
      case 'medical_record':
        return FileText
      case 'evolution':
        return Stethoscope
      case 'photo':
        return Camera
      case 'document':
        return FileText
      default:
        return FileText
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-500'
      case 'prescription':
        return 'bg-green-500'
      case 'exam':
        return 'bg-purple-500'
      case 'medical_record':
        return 'bg-orange-500'
      case 'evolution':
        return 'bg-cyan-500'
      case 'photo':
        return 'bg-pink-500'
      case 'document':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getEventLink = (event: TimelineEvent) => {
    switch (event.type) {
      case 'appointment':
        return `/dashboard/agendamentos`
      case 'prescription':
        return `/dashboard/prescricoes/${event.id}`
      case 'exam':
        return `/dashboard/exames/${event.id}`
      case 'medical_record':
        return `/dashboard/prontuario/${event.id}`
      default:
        return null
    }
  }

  const getAppointmentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Agendada',
      confirmed: 'Confirmada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      no_show: 'Falta',
    }
    return labels[status] || status
  }

  const getExamStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Agendado',
      pending: 'Pendente',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
  }

  const exportHistory = async () => {
    // Implementar exportação em PDF do histórico
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'A exportação do histórico será implementada em breve.',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando histórico...</div>
      </div>
    )
  }

  // Agrupar eventos por data
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const date = new Date(event.date).toLocaleDateString('pt-BR')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as Record<string, TimelineEvent[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/dashboard/pacientes/${patientId}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Histórico Médico Completo</h1>
          <p className="text-muted-foreground mt-1">
            {patient?.name} - CPF: {patient?.cpf}
          </p>
        </div>
        <Button onClick={exportHistory} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar no histórico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Eventos</SelectItem>
                <SelectItem value="appointment">Consultas</SelectItem>
                <SelectItem value="prescription">Prescrições</SelectItem>
                <SelectItem value="exam">Exames</SelectItem>
                <SelectItem value="medical_record">Prontuários</SelectItem>
                <SelectItem value="evolution">Evoluções</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Linha do Tempo */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum evento encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, dateEvents]) => (
              <div key={date} className="space-y-4">
                <h2 className="text-xl font-semibold text-muted-foreground">{date}</h2>
                <div className="space-y-4 pl-8 border-l-2 border-muted">
                  {dateEvents.map((event) => {
                    const Icon = getEventIcon(event.type)
                    const eventLink = getEventLink(event)

                    return (
                      <Card key={event.id} className="relative">
                        <CardHeader>
                          <div className="flex items-start gap-4">
                            <div
                              className={`${getEventColor(event.type)} p-2 rounded-lg text-white`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg">{event.title}</CardTitle>
                              {event.doctor && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Médico: {event.doctor}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">{event.type}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                          {eventLink && (
                            <Link href={eventLink}>
                              <Button variant="outline" size="sm" className="mt-4">
                                Ver Detalhes
                              </Button>
                            </Link>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

