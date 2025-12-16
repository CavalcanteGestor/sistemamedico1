'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { FileText, ExternalLink, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ProntuarioIntegrationProps {
  sessionId: string
  appointmentId?: string
  patientId?: string
  isDoctor: boolean
  aiSummary?: string
  notes?: string
}

export function ProntuarioIntegration({
  sessionId,
  appointmentId,
  patientId,
  isDoctor,
  aiSummary,
  notes,
}: ProntuarioIntegrationProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const openProntuario = () => {
    if (patientId) {
      router.push(`/dashboard/prontuario/${patientId}`)
    } else if (appointmentId) {
      // Buscar patient_id do agendamento
      supabase
        .from('appointments')
        .select('patient_id')
        .eq('id', appointmentId)
        .single()
        .then(({ data }) => {
          if (data?.patient_id) {
            router.push(`/dashboard/prontuario/${data.patient_id}`)
          }
        })
    }
  }

  const saveToProntuario = async () => {
    if (!patientId || !isDoctor) {
      toast({
        title: 'Erro',
        description: 'Não é possível salvar no prontuário.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      // Criar ou atualizar prontuário com dados da telemedicina
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      // Buscar appointment para pegar doctor_id
      const { data: appointment } = await supabase
        .from('appointments')
        .select('doctor_id, appointment_date, appointment_time')
        .eq('id', appointmentId)
        .single()

      if (!appointment) throw new Error('Agendamento não encontrado')

      // Criar entrada no prontuário
      const { error: recordError } = await supabase
        .from('medical_records')
        .insert({
          patient_id: patientId,
          doctor_id: appointment.doctor_id,
          consultation_date: appointment.appointment_date,
          consultation_time: appointment.appointment_time,
          consultation_type: 'telemedicina',
          anamnesis: notes || '',
          evolution: aiSummary || '',
          created_by: user.id,
        })

      if (recordError) throw recordError

      toast({
        title: 'Salvo no prontuário!',
        description: 'Os dados da consulta foram salvos no prontuário do paciente.',
      })

      // Redirecionar para o prontuário
      setTimeout(() => {
        router.push(`/dashboard/prontuario/${patientId}`)
      }, 1500)
    } catch (error: any) {
      // Erro silencioso
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar no prontuário.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isDoctor) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Prontuário do Paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Acesse ou salve os dados desta consulta no prontuário do paciente.
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openProntuario}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir Prontuário
          </Button>

          {(aiSummary || notes) && (
            <Button
              size="sm"
              onClick={saveToProntuario}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Salvar Dados
                </>
              )}
            </Button>
          )}
        </div>

        {(aiSummary || notes) && (
          <p className="text-xs text-muted-foreground">
            💡 Os dados da consulta (anotações e resumo) serão salvos no prontuário.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

