'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Lead {
  id: string
  nome: string
  telefone: string
  contexto?: string
  interesse?: string
}

interface CreateFollowUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeads: Lead[]
  onSuccess?: () => void
}

const TIPO_FOLLOW_UP_OPTIONS = [
  { value: 'reativacao', label: 'Reativação' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'lembrete_consulta', label: 'Lembrete de Consulta' },
  { value: 'orcamento', label: 'Orçamento não respondido' },
  { value: 'pos_consulta', label: 'Follow-up Pós-consulta' },
  { value: 'confirmacao', label: 'Confirmação de Presença' },
  { value: 'reagendamento', label: 'Reagendamento' },
  { value: 'oferta', label: 'Oferta Personalizada' },
]

export function CreateFollowUpDialog({
  open,
  onOpenChange,
  selectedLeads,
  onSuccess,
}: CreateFollowUpDialogProps) {
  const [tipoFollowUp, setTipoFollowUp] = useState('')
  const [tipoMensagem, setTipoMensagem] = useState<'fixo' | 'ia' | 'customizado'>('fixo')
  const [templateId, setTemplateId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const { toast } = useToast()

  // Carregar templates quando mudar o tipo
  useEffect(() => {
    if (tipoFollowUp && tipoMensagem) {
      loadTemplates()
    } else {
      setTemplates([])
    }
  }, [tipoFollowUp, tipoMensagem])

  // Limpar ao fechar
  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  const resetForm = () => {
    setTipoFollowUp('')
    setTipoMensagem('fixo')
    setTemplateId('')
    setMensagem('')
    setTemplates([])
  }

  const loadTemplates = async () => {
    try {
      // Carregar templates fixos quando tipo de mensagem for 'fixo'
      if (tipoMensagem === 'fixo') {
        const response = await fetch(`/api/follow-up/templates?tipoFollowUp=${tipoFollowUp}&tipoTemplate=fixo`)
        const data = await response.json()
        if (data.success) {
          setTemplates(data.data)
        }
      } else if (tipoMensagem === 'ia') {
        // Carregar templates de IA quando tipo de mensagem for 'ia'
        const response = await fetch(`/api/follow-up/templates?tipoFollowUp=${tipoFollowUp}&tipoTemplate=ia`)
        const data = await response.json()
        if (data.success) {
          setTemplates(data.data)
        }
      } else {
        setTemplates([])
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
    }
  }

  const handleTemplateChange = (value: string) => {
    setTemplateId(value)
    const template = templates.find(t => t.id === value)
    if (template) {
      setMensagem(template.conteudo)
    }
  }

  const handleGenerateAI = async () => {
    if (selectedLeads.length === 0) return

    try {
      setGeneratingAI(true)
      
      // Para múltiplos leads, gera para o primeiro como exemplo
      const lead = selectedLeads[0]
      
      // Buscar contexto completo do lead do banco
      let leadContexto = lead.contexto || ''
      if (lead.id) {
        try {
          const supabase = createClient()
          const { data: leadCompleto } = await supabase
            .from('leads')
            .select('contexto, interesse, origem, etapa, status')
            .eq('id', lead.id)
            .single()

          if (leadCompleto) {
            const partesContexto = []
            if (leadCompleto.contexto) partesContexto.push(leadCompleto.contexto)
            if (leadCompleto.interesse) partesContexto.push(`Interesse: ${leadCompleto.interesse}`)
            if (leadCompleto.origem) partesContexto.push(`Origem: ${leadCompleto.origem}`)
            if (leadCompleto.etapa) partesContexto.push(`Etapa: ${leadCompleto.etapa}`)
            
            leadContexto = partesContexto.join('. ') || 'Sem contexto disponível'
          }
        } catch (error) {
          console.error('Erro ao buscar contexto do lead:', error)
        }
      }
      
      const response = await fetch('/api/follow-up/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadContexto: leadContexto || 'Sem contexto disponível',
          leadNome: lead.nome,
          tipoFollowUp,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setMensagem(data.mensagem)
        toast({
          title: 'Mensagem gerada',
          description: 'Mensagem criada pela IA. Você pode editá-la antes de enviar.',
        })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível gerar mensagem',
        variant: 'destructive',
      })
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleSubmit = async () => {
    if (!tipoFollowUp || !mensagem) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }

    if (selectedLeads.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um lead',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      // Se for apenas um lead
      if (selectedLeads.length === 1) {
        const lead = selectedLeads[0]
        const createResponse = await fetch('/api/follow-up/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            leadTelefone: lead.telefone,
            leadNome: lead.nome,
            tipoFollowUp,
            tipoMensagem,
            mensagem,
            templateId: templateId || undefined,
          }),
        })

        const createData = await createResponse.json()
        if (!createData.success) throw new Error(createData.error)

        // Enviar imediatamente
        const sendResponse = await fetch('/api/follow-up/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            followUpId: createData.data.id,
          }),
        })

        const sendData = await sendResponse.json()
        if (!sendData.success) throw new Error(sendData.error)
      } else {
        // Múltiplos leads - criar em lote
        const leads = selectedLeads.map(l => ({
          leadId: l.id,
          leadTelefone: l.telefone,
          leadNome: l.nome,
        }))

        const createResponse = await fetch('/api/follow-up/bulk-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leads,
            tipoFollowUp,
            tipoMensagem,
            mensagem,
            templateId: templateId || undefined,
          }),
        })

        const createData = await createResponse.json()
        if (!createData.success) throw new Error(createData.error)

        // Enviar todos
        const sendResponse = await fetch('/api/follow-up/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            followUpIds: createData.data.ids,
          }),
        })

        const sendData = await sendResponse.json()
        if (!sendData.success) throw new Error(sendData.error)
      }

      toast({
        title: 'Follow-up enviado!',
        description: `Mensagem enviada para ${selectedLeads.length} lead(s)`,
      })

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar follow-up',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Follow-up</DialogTitle>
          <DialogDescription>
            Enviar follow-up para {selectedLeads.length} lead(s) selecionado(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Leads selecionados */}
          <div>
            <Label>Leads Selecionados</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedLeads.slice(0, 5).map((lead) => (
                <Badge key={lead.id} variant="secondary">
                  {lead.nome}
                </Badge>
              ))}
              {selectedLeads.length > 5 && (
                <Badge variant="outline">+{selectedLeads.length - 5} mais</Badge>
              )}
            </div>
          </div>

          {/* Tipo de Follow-up */}
          <div>
            <Label htmlFor="tipoFollowUp">Tipo de Follow-up *</Label>
            <Select value={tipoFollowUp} onValueChange={setTipoFollowUp}>
              <SelectTrigger id="tipoFollowUp">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_FOLLOW_UP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Mensagem */}
          <div>
            <Label htmlFor="tipoMensagem">Tipo de Mensagem *</Label>
            <Select
              value={tipoMensagem}
              onValueChange={(value: any) => setTipoMensagem(value)}
            >
              <SelectTrigger id="tipoMensagem">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixo">Template Fixo</SelectItem>
                <SelectItem value="ia">Gerada por IA</SelectItem>
                <SelectItem value="customizado">Customizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template (para mensagem fixa ou IA) */}
          {((tipoMensagem === 'fixo' || tipoMensagem === 'ia') && templates.length > 0) && (
            <div>
              <Label htmlFor="template">
                {tipoMensagem === 'ia' ? 'Template de Prompt (Opcional)' : 'Template'}
              </Label>
              <Select value={templateId} onValueChange={handleTemplateChange}>
                <SelectTrigger id="template">
                  <SelectValue placeholder={
                    tipoMensagem === 'ia' 
                      ? "Selecione um prompt template (ou deixe vazio para usar padrão)"
                      : "Selecione um template"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.nome}
                      {template.descricao && (
                        <span className="text-xs text-muted-foreground ml-2">
                          - {template.descricao}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoMensagem === 'ia' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Se selecionar um template de prompt, ele será usado como base para a IA gerar a mensagem.
                  Se não selecionar, será usado o prompt padrão do sistema.
                </p>
              )}
            </div>
          )}

          {/* Botão Gerar com IA */}
          {tipoMensagem === 'ia' && tipoFollowUp && (
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateAI}
              disabled={generatingAI || selectedLeads.length === 0}
              className="w-full"
            >
              {generatingAI ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando mensagem...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Mensagem com IA
                </>
              )}
            </Button>
          )}

          {/* Mensagem */}
          <div>
            <Label htmlFor="mensagem">Mensagem *</Label>
            <Textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite a mensagem do follow-up..."
              rows={6}
              className="mt-1"
            />
            {tipoMensagem === 'fixo' && (
              <p className="text-sm text-muted-foreground mt-1">
                Variáveis disponíveis: {'{{nome}}'}, {'{{procedimento}}'}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !mensagem || !tipoFollowUp}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Follow-up'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

