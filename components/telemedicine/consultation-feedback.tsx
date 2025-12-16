'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Star, Send, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'

interface ConsultationFeedbackProps {
  sessionId: string
  isDoctor: boolean
}

export function ConsultationFeedback({ sessionId, isDoctor }: ConsultationFeedbackProps) {
  const [rating, setRating] = useState(0)
  const [technicalQuality, setTechnicalQuality] = useState(0)
  const [audioQuality, setAudioQuality] = useState(0)
  const [videoQuality, setVideoQuality] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    checkIfSubmitted()
  }, [sessionId])

  const checkIfSubmitted = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('telemedicine_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setSubmitted(true)
        setRating(data.rating)
        setTechnicalQuality(data.technical_quality)
        setAudioQuality(data.audio_quality)
        setVideoQuality(data.video_quality)
        setComment(data.comment || '')
      }
    } catch (error) {
      // Erro silencioso - feedback pode não existir
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Avaliação obrigatória',
        description: 'Por favor, dê uma avaliação geral.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para enviar feedback.',
          variant: 'destructive',
        })
        return
      }

      const { error } = await supabase
        .from('telemedicine_feedback')
        .upsert({
          session_id: sessionId,
          user_id: user.id,
          rating,
          technical_quality: technicalQuality || rating,
          audio_quality: audioQuality || rating,
          video_quality: videoQuality || rating,
          comment: comment.trim() || null,
        }, {
          onConflict: 'session_id,user_id',
        })

      if (error) throw error

      setSubmitted(true)
      toast({
        title: 'Feedback enviado!',
        description: 'Obrigado pelo seu feedback. Ele nos ajuda a melhorar o serviço.',
      })
    } catch (error: any) {
      // Erro silencioso
      toast({
        title: 'Erro ao enviar feedback',
        description: error.message || 'Não foi possível enviar o feedback.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number
    onChange: (value: number) => void
    label: string
  }) => (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    </div>
  )

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Feedback Enviado!</h3>
          <p className="text-sm text-muted-foreground">
            Obrigado pelo seu feedback. Ele nos ajuda a melhorar continuamente.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Avaliar Consulta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StarRating
          value={rating}
          onChange={setRating}
          label="Avaliação Geral"
        />

        {!isDoctor && (
          <>
            <StarRating
              value={technicalQuality}
              onChange={setTechnicalQuality}
              label="Qualidade Técnica"
            />
            <StarRating
              value={audioQuality}
              onChange={setAudioQuality}
              label="Qualidade do Áudio"
            />
            <StarRating
              value={videoQuality}
              onChange={setVideoQuality}
              label="Qualidade do Vídeo"
            />
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="comment">Comentários (opcional)</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Deixe seus comentários sobre a consulta..."
            className="min-h-[100px]"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || rating === 0}
          className="w-full"
        >
          {loading ? (
            'Enviando...'
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Feedback
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

