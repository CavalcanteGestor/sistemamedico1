'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Copy,
  Eye,
  Save,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PrescriptionItem {
  medication_name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

interface Template {
  id: string
  name: string
  description?: string
  items: PrescriptionItem[]
  notes?: string
  is_public: boolean
  created_by: string
  created_at: string
  specialty?: {
    name: string
  }
}

export default function PrescriptionTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPublicOnly, setShowPublicOnly] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [items, setItems] = useState<PrescriptionItem[]>([
    { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    notes: '',
    is_public: false,
  })

  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadTemplates()
    loadCurrentUser()
  }, [showPublicOnly])

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user?.id || null)
  }

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('prescription_templates')
        .select(`
          *,
          specialty:specialty_id (name)
        `)
        .order('created_at', { ascending: false })

      // Filtrar por público ou próprios
      if (showPublicOnly) {
        query = query.eq('is_public', true)
      }

      const { data, error } = await query

      if (error) throw error
      setTemplates(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar templates:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os templates.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      if (!formData.name || items.length === 0 || items.some(item => !item.medication_name)) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha o nome e pelo menos um medicamento.',
          variant: 'destructive',
        })
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar doctor_id
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const { error } = await supabase.from('prescription_templates').insert({
        name: formData.name,
        description: formData.description || null,
        items: items.filter(item => item.medication_name),
        notes: formData.notes || null,
        is_public: formData.is_public,
        doctor_id: doctor?.id || null,
        created_by: user.id,
      })

      if (error) throw error

      toast({
        title: 'Template criado!',
        description: 'O template foi salvo com sucesso.',
      })

      setCreateDialogOpen(false)
      resetForm()
      loadTemplates()
    } catch (error: any) {
      console.error('Erro ao criar template:', error)
      toast({
        title: 'Erro ao criar template',
        description: error.message || 'Não foi possível criar o template.',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return

    try {
      if (!formData.name || items.length === 0 || items.some(item => !item.medication_name)) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha o nome e pelo menos um medicamento.',
          variant: 'destructive',
        })
        return
      }

      const { error } = await supabase
        .from('prescription_templates')
        .update({
          name: formData.name,
          description: formData.description || null,
          items: items.filter(item => item.medication_name),
          notes: formData.notes || null,
          is_public: formData.is_public,
        })
        .eq('id', selectedTemplate.id)

      if (error) throw error

      toast({
        title: 'Template atualizado!',
        description: 'O template foi atualizado com sucesso.',
      })

      setEditDialogOpen(false)
      resetForm()
      loadTemplates()
    } catch (error: any) {
      console.error('Erro ao atualizar template:', error)
      toast({
        title: 'Erro ao atualizar template',
        description: error.message || 'Não foi possível atualizar o template.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return

    try {
      const { error } = await supabase
        .from('prescription_templates')
        .delete()
        .eq('id', selectedTemplate.id)

      if (error) throw error

      toast({
        title: 'Template excluído!',
        description: 'O template foi excluído com sucesso.',
      })

      setDeleteDialogOpen(false)
      setSelectedTemplate(null)
      loadTemplates()
    } catch (error: any) {
      console.error('Erro ao excluir template:', error)
      toast({
        title: 'Erro ao excluir template',
        description: error.message || 'Não foi possível excluir o template.',
        variant: 'destructive',
      })
    }
  }

  const handleUseTemplate = (template: Template) => {
    // Salvar template no sessionStorage e redirecionar para nova prescrição
    sessionStorage.setItem('prescription_template', JSON.stringify(template))
    router.push('/dashboard/prescricoes/novo?fromTemplate=true')
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', notes: '', is_public: false })
    setItems([{ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }])
  }

  const openEditDialog = (template: Template) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      notes: template.notes || '',
      is_public: template.is_public,
    })
    setItems(template.items.length > 0 ? template.items : [
      { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ])
    setEditDialogOpen(true)
  }

  const openViewDialog = (template: Template) => {
    setSelectedTemplate(template)
    setViewDialogOpen(true)
  }

  const addItem = () => {
    setItems([...items, { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Se mostrar só públicos, já está filtrado
    if (showPublicOnly) return matchesSearch
    
    // Caso contrário, mostrar próprios ou públicos
    const isOwn = template.created_by === currentUser
    const isPublic = template.is_public
    return matchesSearch && (isOwn || isPublic)
  })

  const canEdit = (template: Template) => {
    return template.created_by === currentUser
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de Prescrições</h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie templates reutilizáveis de prescrições
          </p>
        </div>
        <Button onClick={() => {
          resetForm()
          setCreateDialogOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button
              variant={showPublicOnly ? 'default' : 'outline'}
              onClick={() => setShowPublicOnly(!showPublicOnly)}
            >
              {showPublicOnly ? 'Apenas Públicos' : 'Todos'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Templates ({filteredTemplates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum template encontrado</p>
              <Button className="mt-4" onClick={() => {
                resetForm()
                setCreateDialogOpen(true)
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {template.is_public && (
                          <Badge variant="secondary" className="text-xs">Público</Badge>
                        )}
                        {canEdit(template) && (
                          <Badge variant="outline" className="text-xs">Meu</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <strong>{template.items.length}</strong> {template.items.length === 1 ? 'medicamento' : 'medicamentos'}
                      </p>
                      {template.specialty && (
                        <Badge variant="outline">{template.specialty.name}</Badge>
                      )}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openViewDialog(template)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUseTemplate(template)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Usar
                        </Button>
                        {canEdit(template) && (
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
                              onClick={() => {
                                setSelectedTemplate(template)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Criar/Editar Template */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false)
          setEditDialogOpen(false)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialogOpen ? 'Editar Template' : 'Criar Novo Template'}
            </DialogTitle>
            <DialogDescription>
              {editDialogOpen
                ? 'Atualize as informações do template de prescrição.'
                : 'Crie um template reutilizável de prescrição para agilizar seu trabalho.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Prescrição para Gripe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_public">Visibilidade</Label>
                <Select
                  value={formData.is_public ? 'public' : 'private'}
                  onValueChange={(value) => setFormData({ ...formData, is_public: value === 'public' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Privado (apenas eu)</SelectItem>
                    <SelectItem value="public">Público (todos os médicos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve descrição do template"
              />
            </div>

            {/* Medicamentos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Medicamentos *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              {items.map((item, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-4">
                      <p className="font-medium text-sm">Medicamento {index + 1}</p>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome do Medicamento *</Label>
                        <Input
                          value={item.medication_name}
                          onChange={(e) => updateItem(index, 'medication_name', e.target.value)}
                          placeholder="Ex: Paracetamol"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dosagem *</Label>
                        <Input
                          value={item.dosage}
                          onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                          placeholder="Ex: 500mg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Frequência *</Label>
                        <Input
                          value={item.frequency}
                          onChange={(e) => updateItem(index, 'frequency', e.target.value)}
                          placeholder="Ex: 3x ao dia"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duração *</Label>
                        <Input
                          value={item.duration}
                          onChange={(e) => updateItem(index, 'duration', e.target.value)}
                          placeholder="Ex: 7 dias"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Instruções</Label>
                        <Input
                          value={item.instructions || ''}
                          onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                          placeholder="Instruções adicionais (opcional)"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações Gerais</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações ou instruções gerais para este template"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                setEditDialogOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={editDialogOpen ? handleUpdateTemplate : handleCreateTemplate}>
              <Save className="h-4 w-4 mr-2" />
              {editDialogOpen ? 'Salvar Alterações' : 'Criar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Visualizar Template */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description || 'Visualização do template'}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Medicamentos ({selectedTemplate.items.length})</h4>
                <div className="space-y-3">
                  {selectedTemplate.items.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <p className="font-medium">{item.medication_name}</p>
                          <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div><strong>Dosagem:</strong> {item.dosage}</div>
                            <div><strong>Frequência:</strong> {item.frequency}</div>
                            <div><strong>Duração:</strong> {item.duration}</div>
                          </div>
                          {item.instructions && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Instruções:</strong> {item.instructions}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              {selectedTemplate.notes && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Observações</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTemplate.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
            {selectedTemplate && (
              <Button onClick={() => {
                handleUseTemplate(selectedTemplate)
                setViewDialogOpen(false)
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Usar Este Template
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o template <strong>{selectedTemplate?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

