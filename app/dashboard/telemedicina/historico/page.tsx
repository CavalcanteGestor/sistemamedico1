'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Clock, User, Video, Download, FileText, TrendingUp, Users, Timer } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function TelemedicinaHistoricoPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    try {
      setLoading(true)

      // Construir filtro de data
      let dateFilter: any = {}
      if (filter === 'today') {
        const today = format(new Date(), 'yyyy-MM-dd')
        dateFilter.gte = today
        dateFilter.lte = today
      } else if (filter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        dateFilter.gte = format(weekAgo, 'yyyy-MM-dd')
      } else if (filter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        dateFilter.gte = format(monthAgo, 'yyyy-MM-dd')
      }

      // Buscar sessões (sem feedback na query inicial para evitar erros)
      let query = supabase
        .from('telemedicine_sessions')
        .select(`
          *,
          cancellation_reason,
          cancelled_at,
          cancelled_by,
          appointments:appointment_id (
            *,
            patients:patient_id (
              name,
              email
            ),
            doctors:doctor_id (
              name,
              crm,
              specialties:specialty_id (
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.gte('created_at', dateFilter.gte)
      }

      const { data, error } = await query.limit(100)

      // Buscar feedback separadamente
      let feedbackMap: Record<string, any> = {}
      if (data && data.length > 0) {
        try {
          const sessionIds = data.map((s: any) => s.id)
          const { data: feedbackData } = await supabase
            .from('telemedicine_feedback')
            .select('session_id, rating, technical_quality, audio_quality, video_quality')
            .in('session_id', sessionIds)
          
          if (feedbackData) {
            feedbackData.forEach((fb: any) => {
              if (!feedbackMap[fb.session_id]) {
                feedbackMap[fb.session_id] = []
              }
              feedbackMap[fb.session_id].push(fb)
            })
          }
        } catch (feedbackError) {
          console.warn('Erro ao carregar feedback (não crítico):', feedbackError)
        }
      }

      if (error) {
        console.error('Erro na query do Supabase:', error)
        throw new Error(error.message || 'Erro ao buscar histórico')
      }

      // Filtrar sessões com agendamento válido e adicionar feedback
      const validSessions = (data || [])
        .filter((session: any) => session.appointments !== null)
        .map((session: any) => ({
          ...session,
          feedback: feedbackMap[session.id] || [],
        }))
      
      setSessions(validSessions)

      // Calcular estatísticas
      calculateStats(validSessions)
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error)
      const errorMessage = error?.message || error?.code || 'Erro desconhecido ao carregar o histórico'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
      // Garantir que sempre temos dados válidos
      setSessions([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (sessionsData: any[]) => {
    const total = sessionsData.length
    const completed = sessionsData.filter((s: any) => s.status === 'ended').length
    const avgDuration = sessionsData
      .filter((s: any) => s.duration_seconds)
      .reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0) / completed || 0

    const avgRating = sessionsData
      .filter((s: any) => s.feedback && s.feedback.length > 0)
      .reduce((acc: number, s: any) => {
        const feedback = s.feedback[0]
        return acc + (feedback.rating || 0)
      }, 0) / sessionsData.filter((s: any) => s.feedback && s.feedback.length > 0).length || 0

    const recordings = sessionsData.filter((s: any) => s.recording_url).length

    setStats({
      total,
      completed,
      avgDuration: Math.floor(avgDuration / 60), // em minutos
      avgRating: avgRating.toFixed(1),
      recordings,
    })
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando histórico...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico e Estatísticas</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe todas as consultas de telemedicina realizadas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todas
        </Button>
        <Button
          variant={filter === 'today' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('today')}
        >
          Hoje
        </Button>
        <Button
          variant={filter === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('week')}
        >
          Últimos 7 dias
        </Button>
        <Button
          variant={filter === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('month')}
        >
          Último mês
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Consultas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Consultas realizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completed} de {stats.total} concluídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgDuration} min</div>
              <p className="text-xs text-muted-foreground mt-1">Por consulta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgRating || 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.avgRating ? 'de 5 estrelas' : 'Sem avaliações ainda'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Sessões */}
      <Card>
        <CardHeader>
          <CardTitle>Consultas Realizadas</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma consulta encontrada para este período</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={
                            session.status === 'ended' 
                              ? 'default' 
                              : session.status === 'cancelled' 
                              ? 'destructive' 
                              : session.status === 'active'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {session.status === 'ended' 
                            ? 'Concluída' 
                            : session.status === 'cancelled'
                            ? 'Cancelada'
                            : session.status === 'active'
                            ? 'Ativa'
                            : session.status === 'pending'
                            ? 'Pendente'
                            : session.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {session.appointments?.patients?.name || 'Paciente'}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          Dr(a). {session.appointments?.doctors?.name || 'Médico'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(session.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(session.created_at), 'HH:mm', { locale: ptBR })}
                        </div>
                        {session.duration_seconds && (
                          <div className="flex items-center gap-1">
                            <Timer className="h-4 w-4" />
                            {formatDuration(session.duration_seconds)}
                          </div>
                        )}
                        {session.recording_url && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Video className="h-4 w-4" />
                            Gravada
                          </div>
                        )}
                      </div>

                      {session.feedback && session.feedback.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">⭐ {session.feedback[0].rating}/5</span>
                        </div>
                      )}

                      {session.cancellation_reason && (
                        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                          <p className="font-medium text-destructive mb-1">Motivo do Cancelamento:</p>
                          <p className="text-muted-foreground">{session.cancellation_reason}</p>
                        </div>
                      )}

                      {session.cancelled_at && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Cancelada em: {format(new Date(session.cancelled_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {session.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <Link href={`/dashboard/consultas/detalhes/${session.appointments?.id}`}>
                            <Video className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Link>
                        </Button>
                      )}
                      {session.recording_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(session.recording_url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Gravação
                        </Button>
                      )}
                      {session.ai_summary && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <Link href={`/dashboard/consultas/detalhes/${session.appointments?.id}`}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Resumo
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

