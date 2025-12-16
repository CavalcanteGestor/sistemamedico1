'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, Send, User, Trash2, Edit, Reply } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface CaseStudyCommentsProps {
  caseStudyId: string
  currentUser: any
  onUpdate?: () => void
}

export function CaseStudyComments({ 
  caseStudyId, 
  currentUser,
  onUpdate 
}: CaseStudyCommentsProps) {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadComments()
  }, [caseStudyId])

  const loadComments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('case_study_comments')
        .select(`
          *,
          user_profile:user_id (
            id,
            name,
            email
          ),
          doctor:doctor_id (
            id,
            name,
            crm
          )
        `)
        .eq('case_study_id', caseStudyId)
        .is('parent_comment_id', null) // Apenas comentários principais
        .order('created_at', { ascending: true })

      if (error) throw error

      // Carregar respostas para cada comentário
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('case_study_comments')
            .select(`
              *,
              user_profile:user_id (
                id,
                name,
                email
              ),
              doctor:doctor_id (
                id,
                name,
                crm
              )
            `)
            .eq('parent_comment_id', comment.id)
            .order('created_at', { ascending: true })

          return {
            ...comment,
            replies: replies || [],
          }
        })
      )

      setComments(commentsWithReplies)
    } catch (error: any) {
      console.error('Erro ao carregar comentários:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os comentários.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast({
        title: 'Erro',
        description: 'O comentário não pode estar vazio.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)

      // Buscar doctor_id do usuário atual
      let doctorId = null
      if (currentUser) {
        const { data: doctor } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', currentUser.id)
          .single()

        doctorId = doctor?.id || null
      }

      const { error } = await supabase
        .from('case_study_comments')
        .insert({
          case_study_id: caseStudyId,
          user_id: currentUser?.id,
          doctor_id: doctorId,
          comment_text: newComment.trim(),
        })

      if (error) throw error

      toast({
        title: 'Comentário adicionado',
        description: 'Seu comentário foi publicado com sucesso.',
      })

      setNewComment('')
      loadComments()
      onUpdate?.()
    } catch (error: any) {
      console.error('Erro ao adicionar comentário:', error)
      toast({
        title: 'Erro ao adicionar comentário',
        description: error.message || 'Não foi possível adicionar o comentário.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyText.trim()) {
      toast({
        title: 'Erro',
        description: 'A resposta não pode estar vazia.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)

      let doctorId = null
      if (currentUser) {
        const { data: doctor } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', currentUser.id)
          .single()

        doctorId = doctor?.id || null
      }

      const { error } = await supabase
        .from('case_study_comments')
        .insert({
          case_study_id: caseStudyId,
          user_id: currentUser?.id,
          doctor_id: doctorId,
          comment_text: replyText.trim(),
          parent_comment_id: parentCommentId,
        })

      if (error) throw error

      toast({
        title: 'Resposta adicionada',
        description: 'Sua resposta foi publicada com sucesso.',
      })

      setReplyingTo(null)
      setReplyText('')
      loadComments()
      onUpdate?.()
    } catch (error: any) {
      console.error('Erro ao adicionar resposta:', error)
      toast({
        title: 'Erro ao adicionar resposta',
        description: error.message || 'Não foi possível adicionar a resposta.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) {
      toast({
        title: 'Erro',
        description: 'O comentário não pode estar vazio.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('case_study_comments')
        .update({
          comment_text: editText.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)

      if (error) throw error

      toast({
        title: 'Comentário atualizado',
        description: 'O comentário foi atualizado com sucesso.',
      })

      setEditingComment(null)
      setEditText('')
      loadComments()
      onUpdate?.()
    } catch (error: any) {
      console.error('Erro ao editar comentário:', error)
      toast({
        title: 'Erro ao editar comentário',
        description: error.message || 'Não foi possível editar o comentário.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('case_study_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      toast({
        title: 'Comentário excluído',
        description: 'O comentário foi excluído com sucesso.',
      })

      loadComments()
      onUpdate?.()
    } catch (error: any) {
      console.error('Erro ao excluir comentário:', error)
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o comentário.',
        variant: 'destructive',
      })
    }
  }

  const canEditOrDelete = (comment: any) => {
    return comment.user_id === currentUser?.id
  }

  const getUserName = (comment: any) => {
    if (comment.doctor) {
      return `${comment.doctor.name} - CRM: ${comment.doctor.crm}`
    }
    return comment.user_profile?.name || 'Usuário'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando comentários...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Formulário de novo comentário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Adicionar Comentário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Compartilhe suas observações sobre este caso..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || saving}
            >
              <Send className="mr-2 h-4 w-4" />
              {saving ? 'Publicando...' : 'Publicar Comentário'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de comentários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comentários ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum comentário ainda.</p>
              <p className="text-sm mt-2">
                Seja o primeiro a comentar sobre este caso!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {/* Comentário principal */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{getUserName(comment)}</span>
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(comment.created_at), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </Badge>
                      </div>
                      {canEditOrDelete(comment) && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingComment(comment.id)
                              setEditText(comment.comment_text)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {editingComment === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditComment(comment.id)}
                            disabled={saving}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingComment(null)
                              setEditText('')
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {comment.comment_text}
                      </p>
                    )}

                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(replyingTo === comment.id ? null : comment.id)
                          setReplyText('')
                        }}
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        {replyingTo === comment.id ? 'Cancelar' : 'Responder'}
                      </Button>
                    </div>

                    {/* Formulário de resposta */}
                    {replyingTo === comment.id && (
                      <div className="ml-8 space-y-2 p-3 bg-muted rounded-lg">
                        <Textarea
                          placeholder="Escreva sua resposta..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={2}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyText('')
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSubmitReply(comment.id)}
                            disabled={!replyText.trim() || saving}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Responder
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Respostas */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-8 space-y-3">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id} className="p-3 border rounded-lg bg-muted/50">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{getUserName(reply)}</span>
                              <Badge variant="outline" className="text-xs">
                                {format(new Date(reply.created_at), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                              </Badge>
                            </div>
                            {canEditOrDelete(reply) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteComment(reply.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                            {reply.comment_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

