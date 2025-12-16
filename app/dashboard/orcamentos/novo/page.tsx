'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, ArrowLeft, Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Lead {
  id: string
  nome: string
  telefone: string
}

interface Procedimento {
  nome: string
  descricao: string
  valor: number
}

export default function NovoOrcamentoPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [openLeadCombobox, setOpenLeadCombobox] = useState(false)
  const [procedimentosDisponiveis, setProcedimentosDisponiveis] = useState<any[]>([])
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
  const [desconto, setDesconto] = useState(0)
  const [validadeAte, setValidadeAte] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadLeads()
    loadProcedimentos()
  }, [])

  const loadLeads = async () => {
    try {
      setLoadingLeads(true)
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, telefone')
        .not('telefone', 'is', null)
        .order('nome')

      if (error) throw error
      setLeads(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar leads',
        variant: 'destructive',
      })
    } finally {
      setLoadingLeads(false)
    }
  }

  const loadProcedimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) throw error
      setProcedimentosDisponiveis(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar procedimentos:', error)
    }
  }

  const addProcedimento = () => {
    setProcedimentos([
      ...procedimentos,
      { nome: '', descricao: '', valor: 0 },
    ])
  }

  const removeProcedimento = (index: number) => {
    setProcedimentos(procedimentos.filter((_, i) => i !== index))
  }

  const updateProcedimento = (index: number, field: keyof Procedimento, value: any) => {
    const updated = [...procedimentos]
    updated[index] = { ...updated[index], [field]: value }
    setProcedimentos(updated)
  }

  const selectProcedimentoPadrao = (index: number, procId: string) => {
    const proc = procedimentosDisponiveis.find(p => p.id === procId)
    if (proc) {
      updateProcedimento(index, 'nome', proc.name)
      updateProcedimento(index, 'descricao', proc.description || '')
      updateProcedimento(index, 'valor', parseFloat(proc.price))
    }
  }

  const calcularSubtotal = () => {
    return procedimentos.reduce((sum, proc) => sum + (proc.valor || 0), 0)
  }

  const calcularTotal = () => {
    return calcularSubtotal() - (desconto || 0)
  }

  const handleSubmit = async () => {
    if (!selectedLead) {
      toast({
        title: 'Erro',
        description: 'Selecione um lead',
        variant: 'destructive',
      })
      return
    }

    if (procedimentos.length === 0 || procedimentos.some(p => !p.nome || p.valor <= 0)) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos um procedimento válido',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      const subtotal = calcularSubtotal()
      const total = calcularTotal()

      const response = await fetch('/api/orcamentos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead.id,
          leadTelefone: selectedLead.telefone,
          leadNome: selectedLead.nome,
          procedimentos,
          valores: {
            subtotal,
            desconto: desconto || 0,
            total,
          },
          validadeAte: validadeAte || undefined,
          observacoes,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Orçamento criado!',
          description: 'Orçamento criado com sucesso',
        })
        router.push('/dashboard/orcamentos')
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar orçamento',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Novo Orçamento</h1>
          <p className="text-muted-foreground mt-1">
            Crie um orçamento para enviar ao lead
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Lead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Selecionar Lead *</Label>
            <Popover open={openLeadCombobox} onOpenChange={setOpenLeadCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openLeadCombobox}
                  className="w-full justify-between mt-2"
                >
                  {selectedLead
                    ? `${selectedLead.nome} - ${selectedLead.telefone.replace('@s.whatsapp.net', '')}`
                    : 'Selecione um lead...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar lead..." />
                  <CommandEmpty>Nenhum lead encontrado.</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-[300px]">
                      {leads.map((lead) => (
                        <CommandItem
                          key={lead.id}
                          value={`${lead.nome} ${lead.telefone}`}
                          onSelect={() => {
                            setSelectedLead(lead)
                            setOpenLeadCombobox(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedLead?.id === lead.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div>
                            <p className="font-medium">{lead.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {lead.telefone.replace('@s.whatsapp.net', '')}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Procedimentos</CardTitle>
            <Button onClick={addProcedimento} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Procedimento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {procedimentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Nenhum procedimento adicionado
              </p>
              <Button onClick={addProcedimento} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Procedimento
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {procedimentos.map((proc, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium">Procedimento {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProcedimento(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {procedimentosDisponiveis.length > 0 && (
                    <div>
                      <Label>Selecionar Procedimento Padrão (opcional)</Label>
                      <Select
                        onValueChange={(value) => selectProcedimentoPadrao(index, value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione um procedimento..." />
                        </SelectTrigger>
                        <SelectContent>
                          {procedimentosDisponiveis.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} - {formatCurrency(parseFloat(p.price))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Nome do Procedimento *</Label>
                    <Input
                      value={proc.nome}
                      onChange={(e) => updateProcedimento(index, 'nome', e.target.value)}
                      placeholder="Ex: Botox, Peeling, etc."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={proc.descricao}
                      onChange={(e) => updateProcedimento(index, 'descricao', e.target.value)}
                      placeholder="Descrição do procedimento..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Valor *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={proc.valor || ''}
                      onChange={(e) => updateProcedimento(index, 'valor', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valores e Validade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Subtotal</Label>
              <Input
                value={formatCurrency(calcularSubtotal())}
                disabled
                className="mt-1 font-semibold"
              />
            </div>
            <div>
              <Label>Desconto</Label>
              <Input
                type="number"
                step="0.01"
                value={desconto || ''}
                onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>

          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Valor Total</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(calcularTotal())}
              </span>
            </div>
          </div>

          <div>
            <Label>Validade do Orçamento</Label>
            <Input
              type="date"
              value={validadeAte}
              onChange={(e) => setValidadeAte(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais sobre o orçamento..."
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={loading || !selectedLead || procedimentos.length === 0}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            'Criar Orçamento'
          )}
        </Button>
      </div>
    </div>
  )
}

