'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageSquare, Clock, CheckCircle2, XCircle, Ban } from 'lucide-react'

interface FollowUpHistoryProps {
  leadTelefone: string
}

const STATUS_CONFIG = {
  pendente: {
    label: 'Pendente',
    color: 'bg-yellow-500',
    icon: Clock,
  },
  enviado: {
    label: 'Enviado',
    color: 'bg-green-500',
    icon: CheckCircle2,
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-gray-500',
    icon: Ban,
  },
  falhou: {
    label: 'Falhou',
    color: 'bg-red-500',
    icon: XCircle,
  },
}

const TIPO_FOLLOW_UP_LABELS: Record<string, string> = {
  reativacao: 'Reativação',
  promocao: 'Promoção',
  lembrete_consulta: 'Lembrete de Consulta',
  orcamento: 'Orçamento não respondido',
  pos_consulta: 'Pós-consulta',
  confirmacao: 'Confirmação',
  reagendamento: 'Reagendamento',
  oferta: 'Oferta',
}

export function FollowUpHistory({ leadTelefone }: FollowUpHistoryProps) {
  const [followUps, setFollowUps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (leadTelefone) {
      loadHistory()
    }
  }, [leadTelefone])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/follow-up/history?leadTelefone=${encodeURIComponent(leadTelefone)}`)
      const data = await response.json()

      if (data.success) {
        setFollowUps(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Follow-ups</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    )
  }

  if (followUps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Follow-ups</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum follow-up enviado ainda</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Histórico de Follow-ups ({followUps.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {followUps.map((followUp) => {
              const statusConfig = STATUS_CONFIG[followUp.status as keyof typeof STATUS_CONFIG]
              const StatusIcon = statusConfig.icon

              return (
                <div
                  key={followUp.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {TIPO_FOLLOW_UP_LABELS[followUp.tipo_follow_up] || followUp.tipo_follow_up}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {followUp.tipo_mensagem}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusIcon className={`h-4 w-4 ${statusConfig.color.replace('bg-', 'text-')}`} />
                      <span className="text-xs text-muted-foreground">
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm bg-muted p-3 rounded-md mb-2">
                    {followUp.mensagem}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {format(new Date(followUp.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    {followUp.enviado_em && (
                      <span>
                        Enviado: {format(new Date(followUp.enviado_em), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>

                  {followUp.resposta_recebida && (
                    <div className="mt-2">
                      <Badge variant="default" className="bg-blue-500">
                        ✓ Respondeu
                      </Badge>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

