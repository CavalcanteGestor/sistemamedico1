'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Sparkles,
  Search,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'

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

interface Template {
  id: string
  nome: string
  descricao?: string
  conteudo: string
  tipo_follow_up: string
  tipo_template: 'fixo' | 'ia'
  variaveis_disponiveis: string[]
  ativa: boolean
  criado_em: string
  atualizado_em: string
}

export default function TemplatesPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('all')
  const [filterTipoTemplate, setFilterTipoTemplate] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [userRole, setUserRole] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    conteudo: '',
    tipo_follow_up: '',
    tipo_template: 'fixo' as 'fixo' | 'ia',
    variaveis_disponiveis: [] as string[],
    ativa: true,
  })

  useEffect(() => {
    checkUserRole()
    loadTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchTerm, filterTipo, filterTipoTemplate])

  const checkUserRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile) {
        setUserRole(profile.role)
      }
    }
  }

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/follow-up/templates')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      console.error('Erro ao carregar templates:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os templates',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = [...templates]

    // Filtro de busca
    if (searchTerm) {
      const query = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.nome.toLowerCase().includes(query) ||
          t.descricao?.toLowerCase().includes(query) ||
          t.conteudo.toLowerCase().includes(query)
      )
    }

    // Filtro por tipo de follow-up
    if (filterTipo !== 'all') {
      filtered = filtered.filter((t) => t.tipo_follow_up === filterTipo)
    }

    // Filtro por tipo de template
    if (filterTipoTemplate !== 'all') {
      filtered = filtered.filter((t) => t.tipo_template === filterTipoTemplate)
    }

    setFilteredTemplates(filtered)
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      conteudo: '',
      tipo_follow_up: '',
      tipo_template: 'fixo',
      variaveis_disponiveis: [],
      ativa: true,
    })
    setIsEditing(false)
    setSelectedTemplate(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (template: Template) => {
    setFormData({
      nome: template.nome,
      descricao: template.descricao || '',
      conteudo: template.conteudo,
      tipo_follow_up: template.tipo_follow_up,
      tipo_template: template.tipo_template,
      variaveis_disponiveis: template.variaveis_disponiveis || [],
      ativa: template.ativa,
    })
    setSelectedTemplate(template)
    setIsEditing(true)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.conteudo || !formData.tipo_follow_up) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }

    try {
      const url = '/api/follow-up/templates'
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing
        ? { id: selectedTemplate?.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: isEditing ? 'Template atualizado com sucesso' : 'Template criado com sucesso',
        })
        setDialogOpen(false)
        resetForm()
        loadTemplates()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      console.error('Erro ao salvar template:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o template',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este template?')) {
      return
    }

    try {
      const response = await fetch(`/api/follow-up/templates?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Template deletado com sucesso',
        })
        loadTemplates()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      console.error('Erro ao deletar template:', error)
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível deletar o template',
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async (template: Template) => {
    try {
      const response = await fetch('/api/follow-up/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          ativa: !template.ativa,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: template.ativa ? 'Template desativado' : 'Template ativado',
        })
        loadTemplates()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      console.error('Erro ao alterar status:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status do template',
        variant: 'destructive',
      })
    }
  }

  const getTipoLabel = (tipo: string) => {
    return TIPO_FOLLOW_UP_OPTIONS.find((opt) => opt.value === tipo)?.label || tipo
  }

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g
    const matches = content.matchAll(regex)
    const variables = Array.from(matches, (m) => m[1])
    return Array.from(new Set(variables))
  }

  const handleContentChange = (value: string) => {
    setFormData({
      ...formData,
      conteudo: value,
      variaveis_disponiveis: extractVariables(value),
    })
  }

  const isAdmin = userRole === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de Follow-up</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie templates de mensagens fixas e prompts para IA
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push('/dashboard/leads/follow-up')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Follow-up" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {TIPO_FOLLOW_UP_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTipoTemplate} onValueChange={setFilterTipoTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="fixo">Mensagem Fixa</SelectItem>
                <SelectItem value="ia">Prompt para IA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Templates */}
      <Card>
        <CardHeader>
          <CardTitle>
            Templates ({filteredTemplates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum template encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo Follow-up</TableHead>
                  <TableHead>Tipo Template</TableHead>
                  <TableHead>Variáveis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTipoLabel(template.tipo_follow_up)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.tipo_template === 'ia' ? 'default' : 'secondary'}>
                        {template.tipo_template === 'ia' ? (
                          <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            IA
                          </>
                        ) : (
                          <>
                            <FileText className="h-3 w-3 mr-1" />
                            Fixo
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.variaveis_disponiveis && template.variaveis_disponiveis.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {template.variaveis_disponiveis.slice(0, 3).map((v) => (
                            <Badge key={v} variant="outline" className="text-xs">
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                          {template.variaveis_disponiveis.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.variaveis_disponiveis.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Nenhuma</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {template.ativa ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template)
                            setViewDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(template)}
                            >
                              {template.ativa ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Template' : 'Novo Template'}</DialogTitle>
            <DialogDescription>
              {formData.tipo_template === 'ia'
                ? 'Crie um prompt que será usado pela IA para gerar mensagens personalizadas'
                : 'Crie uma mensagem pronta com variáveis que serão substituídas automaticamente'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome do Template *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Reativação - Lead Inativo"
                />
              </div>
              <div>
                <Label htmlFor="tipo_template">Tipo de Template *</Label>
                <Select
                  value={formData.tipo_template}
                  onValueChange={(v: 'fixo' | 'ia') => setFormData({ ...formData, tipo_template: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Mensagem Fixa
                      </div>
                    </SelectItem>
                    <SelectItem value="ia">
                      <div className="flex items-center">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Prompt para IA
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Breve descrição do template"
              />
            </div>
            <div>
              <Label htmlFor="tipo_follow_up">Tipo de Follow-up *</Label>
              <Select
                value={formData.tipo_follow_up}
                onValueChange={(v) => setFormData({ ...formData, tipo_follow_up: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_FOLLOW_UP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="conteudo">
                {formData.tipo_template === 'ia' ? 'Prompt para IA *' : 'Conteúdo da Mensagem *'}
              </Label>
              <Textarea
                id="conteudo"
                value={formData.conteudo}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={
                  formData.tipo_template === 'ia'
                    ? 'Ex: Crie uma mensagem curta e amigável para reativar um lead que parou de responder. Use linguagem natural e humanizada...'
                    : 'Ex: Oi {{nome}}, tudo bem? 😊 Notei que você estava interessado(a) em {{procedimento}}...'
                }
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.tipo_template === 'ia'
                  ? 'O prompt será usado pela IA para gerar mensagens. Use instruções claras sobre o tom, estilo e objetivo.'
                  : 'Use {{variavel}} para variáveis que serão substituídas automaticamente. Variáveis detectadas: '}
                {formData.variaveis_disponiveis.length > 0 && (
                  <span className="font-medium">
                    {formData.variaveis_disponiveis.map((v) => `{{${v}}}`).join(', ')}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ativa"
                  checked={formData.ativa}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
                />
                <Label htmlFor="ativa">Template ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.nome}</DialogTitle>
            <DialogDescription>{selectedTemplate?.descricao}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Follow-up</Label>
              <p>{getTipoLabel(selectedTemplate?.tipo_follow_up || '')}</p>
            </div>
            <div>
              <Label>Tipo de Template</Label>
              <Badge variant={selectedTemplate?.tipo_template === 'ia' ? 'default' : 'secondary'}>
                {selectedTemplate?.tipo_template === 'ia' ? 'Prompt para IA' : 'Mensagem Fixa'}
              </Badge>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <pre className="whitespace-pre-wrap text-sm">{selectedTemplate?.conteudo}</pre>
              </ScrollArea>
            </div>
            {selectedTemplate?.variaveis_disponiveis && selectedTemplate.variaveis_disponiveis.length > 0 && (
              <div>
                <Label>Variáveis Disponíveis</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTemplate.variaveis_disponiveis.map((v) => (
                    <Badge key={v} variant="outline">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

