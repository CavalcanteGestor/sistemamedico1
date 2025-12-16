'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Phone, Clock, MessageSquare } from 'lucide-react'

interface LeadCardProps {
  lead: {
    id: string
    nome: string
    telefone: string
    mensagem?: string
    data_ultima_msg?: string
    etapa: string
    interesse?: string
    status?: string
    origem?: string
  }
  onDragStart: (e: React.DragEvent, leadId: string) => void
  onClick?: () => void
}

export function LeadCard({ lead, onDragStart, onClick }: LeadCardProps) {
  const formatLastMessageTime = (dateString?: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return format(date, 'HH:mm', { locale: ptBR })
      } else if (diffDays === 1) {
        return 'Ontem'
      } else if (diffDays < 7) {
        return format(date, 'EEE', { locale: ptBR })
      } else {
        return format(date, 'dd/MM', { locale: ptBR })
      }
    } catch {
      return ''
    }
  }

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={onClick}
      className={cn(
        'p-3 cursor-move hover:shadow-md transition-shadow mb-2',
        'bg-card border-border',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm truncate">{lead.nome || 'Sem nome'}</h4>
          {lead.status === 'novo' && (
            <Badge variant="default" className="text-xs">
              Novo
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          <span className="truncate">{lead.telefone.replace('@s.whatsapp.net', '')}</span>
        </div>

        {lead.mensagem && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p className="line-clamp-2 flex-1">{lead.mensagem}</p>
          </div>
        )}

        {lead.interesse && (
          <Badge variant="outline" className="text-xs">
            {lead.interesse}
          </Badge>
        )}

        {lead.data_ultima_msg && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatLastMessageTime(lead.data_ultima_msg)}</span>
          </div>
        )}

        {lead.origem && (
          <Badge variant="secondary" className="text-xs">
            {lead.origem}
          </Badge>
        )}
      </div>
    </Card>
  )
}

