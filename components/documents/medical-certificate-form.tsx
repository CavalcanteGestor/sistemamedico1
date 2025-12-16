'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { FileText, Download } from 'lucide-react'

interface MedicalCertificateFormProps {
  patientId?: string
  onClose?: () => void
}

export function MedicalCertificateForm({ patientId, onClose }: MedicalCertificateFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState(patientId || '')
  const [reason, setReason] = useState('')
  const [absenceDays, setAbsenceDays] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cidCode, setCidCode] = useState('')
  const [cidDescription, setCidDescription] = useState('')
  const [observations, setObservations] = useState('')

  useEffect(() => {
    loadPatients()
    if (patientId) {
      setSelectedPatient(patientId)
    }
  }, [patientId])

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, cpf')
        .order('name')

      if (error) throw error
      setPatients(data || [])
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    }
  }

  const handleGeneratePDF = async () => {
    if (!selectedPatient || !reason) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o paciente e informe o motivo do atestado.',
        variant: 'destructive',
      })
      return
    }

    try {
      setGeneratingPDF(true)

      const response = await fetch('/api/pdf/certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: selectedPatient,
          reason,
          absenceDays: absenceDays || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          cidCode: cidCode || undefined,
          cidDescription: cidDescription || undefined,
          observations: observations || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao gerar PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const patient = patients.find((p) => p.id === selectedPatient)
      a.download = `atestado-${patient?.name || 'paciente'}-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Atestado gerado com sucesso!',
        description: 'O arquivo está sendo baixado.',
      })

      // Limpar formulário
      if (onClose) {
        onClose()
      } else {
        setSelectedPatient('')
        setReason('')
        setAbsenceDays('')
        setStartDate('')
        setEndDate('')
        setCidCode('')
        setCidDescription('')
        setObservations('')
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar atestado',
        description: error.message || 'Não foi possível gerar o atestado',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPDF(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Gerar Atestado Médico
        </CardTitle>
        <CardDescription>
          Preencha os dados para gerar o atestado médico em PDF
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="patient">Paciente *</Label>
          <Select
            value={selectedPatient}
            onValueChange={setSelectedPatient}
            disabled={!!patientId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o paciente" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.name} - CPF: {patient.cpf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Motivo do Atestado *</Label>
          <Textarea
            id="reason"
            placeholder="Descreva o motivo do atestado médico..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="absenceDays">Dias de Afastamento</Label>
            <Input
              id="absenceDays"
              type="number"
              min="0"
              placeholder="Ex: 3"
              value={absenceDays}
              onChange={(e) => setAbsenceDays(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cidCode">CID-10 (Opcional)</Label>
            <Input
              id="cidCode"
              placeholder="Ex: M54.5"
              value={cidCode}
              onChange={(e) => setCidCode(e.target.value)}
            />
          </div>
        </div>

        {cidCode && (
          <div className="space-y-2">
            <Label htmlFor="cidDescription">Descrição do CID</Label>
            <Input
              id="cidDescription"
              placeholder="Descrição do código CID"
              value={cidDescription}
              onChange={(e) => setCidDescription(e.target.value)}
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Data Início (Opcional)</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Data Fim (Opcional)</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observations">Observações Adicionais</Label>
          <Textarea
            id="observations"
            placeholder="Observações complementares..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <Button onClick={handleGeneratePDF} disabled={generatingPDF}>
            <Download className="mr-2 h-4 w-4" />
            {generatingPDF ? 'Gerando...' : 'Gerar e Baixar PDF'}
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

