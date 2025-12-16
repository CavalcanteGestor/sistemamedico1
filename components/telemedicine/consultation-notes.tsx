'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Save, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ConsultationNotesProps {
  sessionId: string
  isDoctor: boolean
  appointmentId?: string
}

export function ConsultationNotes({ sessionId, isDoctor, appointmentId }: ConsultationNotesProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (isDoctor) {
      loadNotes()
    }
  }, [sessionId, isDoctor])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Carregar notas da sessão
      const { data: sessionNotesData } = await supabase
        .from('telemedicine_notes')
        .select('note')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
      
      const sessionNotes = sessionNotesData && sessionNotesData.length > 0 ? sessionNotesData[0] : null

      if (sessionNotes) {
        setNotes(sessionNotes.note)
      }

      // Carregar notas gerais da sessão
      const { data: sessionData } = await supabase
        .from('telemedicine_sessions')
        .select('notes')
        .eq('id', sessionId)
        .maybeSingle()
      
      const session = sessionData

      if (session?.notes) {
        setNotes((prev) => prev || session.notes)
      }
    } catch (error: any) {
      // Erro silencioso - tabela pode não existir ou RLS pode bloquear
      // Não bloquear a interface se houver erro
    } finally {
      setLoading(false)
    }
  }

  const saveNotes = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para salvar notas.',
          variant: 'destructive',
        })
        return
      }

      // Salvar no banco de dados
      const { error: noteError } = await supabase
        .from('telemedicine_notes')
        .upsert({
          session_id: sessionId,
          user_id: user.id,
          note: notes,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'session_id,user_id',
        })

      if (noteError) throw noteError

      // Também salvar nas notas gerais da sessão
      const { error: sessionError } = await supabase
        .from('telemedicine_sessions')
        .update({ notes })
        .eq('id', sessionId)

      if (sessionError) throw sessionError

      toast({
        title: 'Notas salvas',
        description: 'Suas anotações foram salvas com sucesso.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar as notas.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const autoSave = async () => {
    if (notes.trim().length > 0 && isDoctor) {
      await saveNotes()
    }
  }

  // Auto-save após 3 segundos sem digitar
  useEffect(() => {
    if (!isDoctor) return

    const timer = setTimeout(() => {
      autoSave()
    }, 3000)

    return () => clearTimeout(timer)
  }, [notes])

  if (!isDoctor) {
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Anotações da Consulta
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={saveNotes}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Faça suas anotações durante a consulta... (Salvamento automático após 3 segundos)"
          className="min-h-[200px] resize-none"
        />
        <p className="text-xs text-muted-foreground mt-2">
          {notes.length} caracteres • As notas são salvas automaticamente
        </p>
      </CardContent>
    </Card>
  )
}

