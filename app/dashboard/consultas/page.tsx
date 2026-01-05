'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Calendar,
  User,
  Stethoscope,
  Video,
  MapPin,
  FileText,
  Plus,
  Eye,
  Play,
  ClipboardList,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function ConsultasPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
    loadAppointments()
  }, [statusFilter, typeFilter])

  const loadAppointments = async () => {
    try {
      setLoading(true)

      // Verificar se é médico
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      let query = supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (
            id,
            name,
            crm,
            email,
            specialty_id,
            specialties:specialty_id (
              id,
              name
            )
          ),
          patients:patient_id (
            id,
            name,
            cpf,
            phone
          )
        `)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })

      // Se for médico, filtrar apenas suas consultas
      if (profile?.role === 'medico') {
        const { data: doctor } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (doctor) {
          query = query.eq('doctor_id', doctor.id)
        }
      }

      const { data, error } = await query

      if (error) {
        // Log detalhado do erro antes de lançar
        const errorDetails = {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          user: user.id,
          profileRole: profile?.role,
        }
        console.error('Erro na query de appointments:', errorDetails)
        console.error('Erro completo (serializado):', JSON.stringify(errorDetails, null, 2))
        throw error
      }

      // Aplicar filtros
      let filtered = data || []

      if (statusFilter !== 'all') {
        filtered = filtered.filter((apt: any) => apt.status === statusFilter)
      }

      if (typeFilter !== 'all') {
        filtered = filtered.filter((apt: any) => apt.consultation_type === typeFilter)
      }

      setAppointments(filtered)
    } catch (error: any) {
      // Tentar extrair informações do erro de várias formas
      let errorMessage = 'Não foi possível carregar as consultas'
      let errorCode = null
      let errorDetails = null
      
      try {
        if (error) {
          // Tentar acessar propriedades comuns do erro Supabase
          errorMessage = error.message || error.details || error.hint || errorMessage
          errorCode = error.code || null
          errorDetails = error.details || null
          
          // Se ainda não tiver mensagem, tentar serializar
          if (!errorMessage || errorMessage === 'Não foi possível carregar as consultas') {
            try {
              const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error))
              if (errorStr && errorStr !== '{}') {
                const parsed = JSON.parse(errorStr)
                errorMessage = parsed.message || parsed.details || parsed.hint || errorMessage
                errorCode = parsed.code || errorCode
              }
            } catch (e) {
              // Ignorar erro de serialização
            }
          }
        }
      } catch (e) {
        console.error('Erro ao processar informações do erro:', e)
      }
      
      // Log detalhado
      const errorInfo = {
        error,
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorKeys: error ? Object.keys(error) : [],
        errorString: error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'Erro vazio',
      }
      console.error('Erro ao carregar consultas:', errorInfo)
      console.error('Erro completo (serializado):', JSON.stringify(errorInfo, null, 2))
      
      // Mensagem final para o usuário
      const finalMessage = errorCode 
        ? `${errorMessage} (Código: ${errorCode})`
        : errorMessage
      
      toast({
        title: 'Erro ao carregar consultas',
        description: finalMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const canStartConsultation = (appointment: any) => {
    const today = new Date().toISOString().split('T')[0]
    const isToday = appointment.appointment_date === today
    const isScheduled = appointment.status === 'scheduled' || appointment.status === 'confirmed'
    return isToday && isScheduled
  }

  const canAddData = (appointment: any) => {
    return appointment.status === 'completed' && 
           (appointment.consultation_type === 'presencial' || !appointment.consultation_type)
  }

  const hasTelemedicineSession = async (appointmentId: string) => {
    const { data } = await supabase
      .from('telemedicine_sessions')
      .select('id, status')
      .eq('appointment_id', appointmentId)
      .maybeSingle()
    return !!data
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: { variant: 'default' as const, label: 'Concluída' },
      scheduled: { variant: 'secondary' as const, label: 'Agendada' },
      confirmed: { variant: 'default' as const, label: 'Confirmada' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelada' },
      no_show: { variant: 'outline' as const, label: 'Não Compareceu' },
    }
    const config = variants[status] || { variant: 'secondary' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeIcon = (type: string) => {
    if (type === 'telemedicina' || type === 'hibrida') {
      return <Video className="h-4 w-4" />
    }
    return <MapPin className="h-4 w-4" />
  }

  const filteredAppointments = appointments.filter((apt) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      apt.patients?.name?.toLowerCase().includes(query) ||
      apt.doctors?.name?.toLowerCase().includes(query) ||
      apt.patients?.cpf?.includes(query) ||
      apt.patients?.phone?.includes(query)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Consultas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie consultas presenciais e online (telemedicina)
          </p>
        </div>
        <Link href="/dashboard/agendamentos/novo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Consulta
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, médico, CPF ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {mounted ? (
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="no_show">Não Compareceu</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="telemedicina">Telemedicina</SelectItem>
                    <SelectItem value="hibrida">Híbrida</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <div className="w-full md:w-[180px] h-10 rounded-md border border-input bg-background animate-pulse" />
                <div className="w-full md:w-[180px] h-10 rounded-md border border-input bg-background animate-pulse" />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Consultas */}
      <Card>
        <CardHeader>
          <CardTitle>Consultas ({filteredAppointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando consultas...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma consulta encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => {
                    const isPresencial = appointment.consultation_type === 'presencial' || !appointment.consultation_type
                    const isTelemedicina = appointment.consultation_type === 'telemedicina' || appointment.consultation_type === 'hibrida'
                    const canStart = canStartConsultation(appointment)
                    const canAdd = canAddData(appointment)

                    return (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {format(new Date(appointment.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {appointment.appointment_time || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {appointment.patients?.name || 'N/A'}
                              </div>
                              {appointment.patients?.cpf && (
                                <div className="text-sm text-muted-foreground">
                                  CPF: {appointment.patients.cpf}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {appointment.doctors?.name || 'N/A'}
                              </div>
                              {appointment.doctors?.crm && (
                                <div className="text-sm text-muted-foreground">
                                  CRM: {appointment.doctors.crm}
                                </div>
                              )}
                              {appointment.doctors?.specialties?.name && (
                                <div className="text-sm text-muted-foreground">
                                  {appointment.doctors.specialties.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(appointment.consultation_type || 'presencial')}
                            <span className="capitalize">
                              {appointment.consultation_type || 'Presencial'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <Link href={`/dashboard/consultas/detalhes/${appointment.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </Button>
                            </Link>
                            
                            {/* Iniciar Consulta Presencial */}
                            {isPresencial && canStart && (
                              <Link href={`/dashboard/prontuario/novo?appointment_id=${appointment.id}`}>
                                <Button size="sm" variant="default">
                                  <Play className="h-4 w-4 mr-2" />
                                  Iniciar Consulta
                                </Button>
                              </Link>
                            )}

                            {/* Iniciar Consulta Online */}
                            {isTelemedicina && canStart && (
                              <Link href={`/dashboard/consultas/telemedicina/${appointment.id}`}>
                                <Button size="sm" variant="default">
                                  <Video className="h-4 w-4 mr-2" />
                                  Iniciar Online
                                </Button>
                              </Link>
                            )}

                            {/* Adicionar Dados (Consulta Presencial Concluída) */}
                            {isPresencial && canAdd && (
                              <Link href={`/dashboard/prontuario/novo?appointment_id=${appointment.id}`}>
                                <Button size="sm" variant="secondary">
                                  <ClipboardList className="h-4 w-4 mr-2" />
                                  Adicionar Dados
                                </Button>
                              </Link>
                            )}

                            {/* Ver Resumo (Telemedicina Concluída) */}
                            {isTelemedicina && appointment.status === 'completed' && (
                              <Link href={`/dashboard/consultas/detalhes/${appointment.id}`}>
                                <Button size="sm" variant="secondary">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Ver Resumo
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
