'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft, Download, FileText, Pill } from 'lucide-react'

export default function PrescricaoDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const prescriptionId = params.id as string
  const supabase = createClient()
  const { toast } = useToast()
  const [prescription, setPrescription] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    if (prescriptionId) {
      loadPrescription()
    }
  }, [prescriptionId])

  const loadPrescription = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patients:patient_id (
            id,
            name,
            cpf,
            birth_date,
            email,
            phone
          ),
          doctors:doctor_id (
            id,
            name,
            crm,
            email
          )
        `)
        .eq('id', prescriptionId)
        .single()

      if (error) throw error
      setPrescription(data)

      const { data: itemsData, error: itemsError } = await supabase
        .from('prescription_items')
        .select(`
          *,
          medications:medication_id (
            name
          )
        `)
        .eq('prescription_id', prescriptionId)
        .order('created_at', { ascending: true })

      if (itemsError) throw itemsError
      setItems(itemsData || [])
    } catch (error: any) {
      console.error('Erro ao carregar prescrição:', error)
      toast({
        title: 'Erro ao carregar prescrição',
        description: error.message || 'Não foi possível carregar a prescrição',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    try {
      setGeneratingPDF(true)
      const response = await fetch(`/api/pdf/prescription/${prescriptionId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao gerar PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receita-${prescriptionId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'PDF gerado com sucesso!',
        description: 'O arquivo está sendo baixado.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar PDF',
        description: error.message || 'Não foi possível gerar o PDF',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPDF(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatDateWithTime = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando detalhes da prescrição...</div>
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Prescrição não encontrada.</p>
        <Link href="/dashboard/prescricoes">
          <Button variant="outline" className="mt-4">
            Voltar para Prescrições
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/prescricoes">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prescrição Médica</h1>
          <p className="text-muted-foreground mt-1">
            Data: {formatDate(prescription.prescription_date)}
          </p>
        </div>
        <Button onClick={handleGeneratePDF} disabled={generatingPDF}>
          <Download className="mr-2 h-4 w-4" />
          {generatingPDF ? 'Gerando...' : 'Baixar PDF'}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
              <p className="font-medium">{prescription.patients?.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">CPF</Label>
              <p>{prescription.patients?.cpf || 'N/A'}</p>
            </div>
            {prescription.patients?.birth_date && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Data de Nascimento</Label>
                <p>{formatDate(prescription.patients.birth_date)}</p>
              </div>
            )}
            {prescription.patients?.email && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p>{prescription.patients.email}</p>
              </div>
            )}
            {prescription.patients?.phone && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                <p>{prescription.patients.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Médico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
              <p className="font-medium">{prescription.doctors?.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">CRM</Label>
              <p>{prescription.doctors?.crm || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Data da Prescrição</Label>
              <p>{formatDate(prescription.prescription_date)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medicamentos Prescritos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum medicamento cadastrado nesta prescrição.
            </p>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {index + 1}. {item.medications?.name || item.medication_name || 'Medicamento'}
                      </h3>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Dosagem:</span>{' '}
                      {item.dosage || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Frequência:</span>{' '}
                      {item.frequency || 'N/A'}
                    </div>
                    {item.duration && (
                      <div>
                        <span className="font-medium text-muted-foreground">Duração:</span>{' '}
                        {item.duration}
                      </div>
                    )}
                  </div>
                  {item.instructions && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="font-medium text-muted-foreground text-sm">Instruções:</span>
                      <p className="mt-1 text-sm">{item.instructions}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {prescription.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{prescription.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}>{children}</label>
}

