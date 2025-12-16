'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  User,
  Users,
  TrendingUp,
  Briefcase,
  Stethoscope,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface QuickMessageTopic {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  order_index: number
  active: boolean
}

interface QuickMessage {
  id: string
  topic_id: string
  label: string
  message: string
  icon?: string
  order_index: number
  active: boolean
}

const AVAILABLE_ICONS = [
  { value: 'Calendar', label: 'Calendário', icon: Calendar },
  { value: 'FileText', label: 'Documento', icon: FileText },
  { value: 'MessageSquare', label: 'Mensagem', icon: MessageSquare },
  { value: 'Clock', label: 'Relógio', icon: Clock },
  { value: 'CheckCircle2', label: 'Check', icon: CheckCircle2 },
  { value: 'Phone', label: 'Telefone', icon: Phone },
  { value: 'Mail', label: 'Email', icon: Mail },
  { value: 'MapPin', label: 'Localização', icon: MapPin },
  { value: 'User', label: 'Usuário', icon: User },
  { value: 'Users', label: 'Usuários', icon: Users },
  { value: 'TrendingUp', label: 'Tendência', icon: TrendingUp },
  { value: 'Briefcase', label: 'Maleta', icon: Briefcase },
  { value: 'Stethoscope', label: 'Estetoscópio', icon: Stethoscope },
]

const getIconComponent = (iconName?: string) => {
  const iconMap: Record<string, any> = {
    Calendar,
    FileText,
    MessageSquare,
    Clock,
    CheckCircle2,
    Phone,
    Mail,
    MapPin,
    User,
    Users,
    TrendingUp,
    Briefcase,
    Stethoscope,
  }
  return iconName ? (iconMap[iconName] || MessageSquare) : MessageSquare
}

export default function MensagensRapidasPage() {
  const [topics, setTopics] = useState<QuickMessageTopic[]>([])
  const [messages, setMessages] = useState<QuickMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [showTopicDialog, setShowTopicDialog] = useState(false)
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [editingTopic, setEditingTopic] = useState<QuickMessageTopic | null>(null)
  const [editingMessage, setEditingMessage] = useState<QuickMessage | null>(null)
  const [topicForm, setTopicForm] = useState({ name: '', description: '', icon: 'MessageSquare', color: 'blue', order_index: 0 })
  const [messageForm, setMessageForm] = useState({ label: '', message: '', icon: 'MessageSquare', order_index: 0 })
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadTopics(), loadMessages()])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_message_topics')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      setTopics(data || [])
      if (data && data.length > 0 && !selectedTopicId) {
        setSelectedTopicId(data[0].id)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível carregar os tópicos',
        variant: 'destructive',
      })
    }
  }

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_messages')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível carregar as mensagens',
        variant: 'destructive',
      })
    }
  }

  const handleCreateTopic = () => {
    setEditingTopic(null)
    setTopicForm({ name: '', description: '', icon: 'MessageSquare', color: 'blue', order_index: topics.length })
    setShowTopicDialog(true)
  }

  const handleEditTopic = (topic: QuickMessageTopic) => {
    setEditingTopic(topic)
    setTopicForm({
      name: topic.name,
      description: topic.description || '',
      icon: topic.icon || 'MessageSquare',
      color: topic.color || 'blue',
      order_index: topic.order_index,
    })
    setShowTopicDialog(true)
  }

  const handleSaveTopic = async () => {
    if (!topicForm.name.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome do tópico é obrigatório',
        variant: 'destructive',
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (editingTopic) {
        const { error } = await supabase
          .from('quick_message_topics')
          .update({
            name: topicForm.name,
            description: topicForm.description,
            icon: topicForm.icon,
            color: topicForm.color,
            order_index: topicForm.order_index,
          })
          .eq('id', editingTopic.id)

        if (error) throw error

        toast({
          title: 'Sucesso',
          description: 'Tópico atualizado com sucesso',
        })
      } else {
        const { error } = await supabase
          .from('quick_message_topics')
          .insert({
            name: topicForm.name,
            description: topicForm.description,
            icon: topicForm.icon,
            color: topicForm.color,
            order_index: topicForm.order_index,
            created_by: user?.id,
            active: true,
          })

        if (error) throw error

        toast({
          title: 'Sucesso',
          description: 'Tópico criado com sucesso',
        })
      }

      setShowTopicDialog(false)
      loadTopics()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o tópico',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Tem certeza que deseja excluir este tópico? Isso também excluirá todas as mensagens associadas.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('quick_message_topics')
        .delete()
        .eq('id', topicId)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Tópico excluído com sucesso',
      })

      loadData()
      if (selectedTopicId === topicId && topics.length > 1) {
        const remainingTopics = topics.filter(t => t.id !== topicId)
        setSelectedTopicId(remainingTopics[0]?.id || null)
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o tópico',
        variant: 'destructive',
      })
    }
  }

  const handleCreateMessage = () => {
    if (!selectedTopicId) {
      toast({
        title: 'Erro',
        description: 'Selecione um tópico primeiro',
        variant: 'destructive',
      })
      return
    }

    setEditingMessage(null)
    setMessageForm({ label: '', message: '', icon: 'MessageSquare', order_index: getMessagesForTopic(selectedTopicId).length })
    setShowMessageDialog(true)
  }

  const handleEditMessage = (message: QuickMessage) => {
    setEditingMessage(message)
    setMessageForm({
      label: message.label,
      message: message.message,
      icon: message.icon || 'MessageSquare',
      order_index: message.order_index,
    })
    setShowMessageDialog(true)
  }

  const handleSaveMessage = async () => {
    if (!selectedTopicId) {
      toast({
        title: 'Erro',
        description: 'Selecione um tópico primeiro',
        variant: 'destructive',
      })
      return
    }

    if (!messageForm.label.trim() || !messageForm.message.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (editingMessage) {
        const { error } = await supabase
          .from('quick_messages')
          .update({
            label: messageForm.label,
            message: messageForm.message,
            icon: messageForm.icon,
            order_index: messageForm.order_index,
          })
          .eq('id', editingMessage.id)

        if (error) throw error

        toast({
          title: 'Sucesso',
          description: 'Mensagem atualizada com sucesso',
        })
      } else {
        const { error } = await supabase
          .from('quick_messages')
          .insert({
            topic_id: selectedTopicId,
            label: messageForm.label,
            message: messageForm.message,
            icon: messageForm.icon,
            order_index: messageForm.order_index,
            created_by: user?.id,
            active: true,
          })

        if (error) throw error

        toast({
          title: 'Sucesso',
          description: 'Mensagem criada com sucesso',
        })
      }

      setShowMessageDialog(false)
      loadMessages()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar a mensagem',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('quick_messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Mensagem excluída com sucesso',
      })

      loadMessages()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir a mensagem',
        variant: 'destructive',
      })
    }
  }

  const getMessagesForTopic = (topicId: string) => {
    return messages.filter(m => m.topic_id === topicId).sort((a, b) => a.order_index - b.order_index)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mensagens Rápidas</h1>
          <p className="text-muted-foreground">Gerencie tópicos e mensagens rápidas para WhatsApp</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sidebar de Tópicos */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tópicos</CardTitle>
                <Button size="sm" onClick={handleCreateTopic}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {topics.map((topic) => {
                const TopicIcon = getIconComponent(topic.icon)
                const isSelected = selectedTopicId === topic.id
                const messagesCount = getMessagesForTopic(topic.id).length

                return (
                  <div
                    key={topic.id}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedTopicId(topic.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <TopicIcon className="h-4 w-4" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{topic.name}</p>
                          {topic.description && (
                            <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
                          )}
                          <Badge variant="secondary" className="text-xs mt-1">
                            {messagesCount} mensagem{messagesCount !== 1 ? 'ens' : ''}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditTopic(topic)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTopic(topic.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {topics.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum tópico cadastrado. Clique em "Novo" para criar.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mensagens do Tópico Selecionado */}
        <div className="lg:col-span-2">
          {selectedTopicId ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Mensagens - {topics.find(t => t.id === selectedTopicId)?.name}
                    </CardTitle>
                    <CardDescription>
                      {topics.find(t => t.id === selectedTopicId)?.description}
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={handleCreateMessage}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Mensagem
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getMessagesForTopic(selectedTopicId).map((message) => {
                    const MsgIcon = getIconComponent(message.icon)
                    return (
                      <div
                        key={message.id}
                        className="p-4 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <MsgIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm mb-1">{message.label}</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {message.message}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditMessage(message)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {getMessagesForTopic(selectedTopicId).length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma mensagem neste tópico. Clique em "Nova Mensagem" para criar.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Selecione um tópico para ver as mensagens ou crie um novo tópico
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de Tópico */}
      <Dialog open={showTopicDialog} onOpenChange={setShowTopicDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTopic ? 'Editar Tópico' : 'Novo Tópico'}</DialogTitle>
            <DialogDescription>
              {editingTopic ? 'Atualize as informações do tópico' : 'Crie um novo tópico para organizar mensagens'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic-name">Nome do Tópico *</Label>
              <Input
                id="topic-name"
                value={topicForm.name}
                onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                placeholder="Ex: Agendamentos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-description">Descrição</Label>
              <Input
                id="topic-description"
                value={topicForm.description}
                onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                placeholder="Ex: Mensagens relacionadas a agendamentos"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="topic-icon">Ícone</Label>
                <Select
                  value={topicForm.icon}
                  onValueChange={(value) => setTopicForm({ ...topicForm, icon: value })}
                >
                  <SelectTrigger id="topic-icon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((icon) => {
                      const IconComponent = icon.icon
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic-color">Cor</Label>
                <Select
                  value={topicForm.color}
                  onValueChange={(value) => setTopicForm({ ...topicForm, color: value })}
                >
                  <SelectTrigger id="topic-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Azul</SelectItem>
                    <SelectItem value="green">Verde</SelectItem>
                    <SelectItem value="purple">Roxo</SelectItem>
                    <SelectItem value="orange">Laranja</SelectItem>
                    <SelectItem value="red">Vermelho</SelectItem>
                    <SelectItem value="gray">Cinza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-order">Ordem</Label>
              <Input
                id="topic-order"
                type="number"
                value={topicForm.order_index}
                onChange={(e) => setTopicForm({ ...topicForm, order_index: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTopicDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTopic}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Mensagem */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMessage ? 'Editar Mensagem' : 'Nova Mensagem'}</DialogTitle>
            <DialogDescription>
              {editingMessage ? 'Atualize a mensagem rápida' : 'Crie uma nova mensagem rápida'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message-label">Label/Nome *</Label>
              <Input
                id="message-label"
                value={messageForm.label}
                onChange={(e) => setMessageForm({ ...messageForm, label: e.target.value })}
                placeholder="Ex: Confirmar Agendamento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message-text">Mensagem *</Label>
              <Textarea
                id="message-text"
                value={messageForm.message}
                onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                placeholder="Digite o texto da mensagem..."
                rows={6}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="message-icon">Ícone</Label>
                <Select
                  value={messageForm.icon}
                  onValueChange={(value) => setMessageForm({ ...messageForm, icon: value })}
                >
                  <SelectTrigger id="message-icon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((icon) => {
                      const IconComponent = icon.icon
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message-order">Ordem</Label>
                <Input
                  id="message-order"
                  type="number"
                  value={messageForm.order_index}
                  onChange={(e) => setMessageForm({ ...messageForm, order_index: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMessage}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

