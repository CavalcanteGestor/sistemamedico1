'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, FileText, Calendar, Pill, FileSearch, History } from 'lucide-react'

export default function PacienteDetalhesPage() {
  const params = useParams()
  const patientId = params.id as string
  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (patientId) {
      loadPatient()
    }
  }, [patientId])

  const loadPatient = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single()

      if (error) throw error
      setPatient(data)
    } catch (error: any) {
      console.error('Erro ao carregar paciente:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando paciente...</div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Paciente não encontrado.</p>
        <Link href="/dashboard/pacientes">
          <Button variant="outline" className="mt-4">
            Voltar para Pacientes
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/pacientes">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{patient.name}</h1>
            <p className="text-muted-foreground mt-1">
              CPF: {patient.cpf} | Email: {patient.email}
            </p>
          </div>
          <Link href={`/dashboard/pacientes/${patientId}/historico`}>
            <Button>
              <History className="mr-2 h-4 w-4" />
              Ver Histórico Completo
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
              <p className="font-medium">{patient.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">CPF</Label>
              <p>{patient.cpf}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Data de Nascimento</Label>
              <p>{new Date(patient.birth_date).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <p>{patient.email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
              <p>{patient.phone}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.address && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Endereço</Label>
                <p>{patient.address}</p>
              </div>
            )}
            {(patient.city || patient.state) && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Cidade/Estado</Label>
                <p>
                  {patient.city || ''} {patient.state ? `- ${patient.state}` : ''}
                </p>
              </div>
            )}
            {patient.zip_code && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">CEP</Label>
                <p>{patient.zip_code}</p>
              </div>
            )}
            {patient.emergency_contact && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Contato de Emergência</Label>
                <p>
                  {patient.emergency_contact}
                  {patient.emergency_phone && ` - ${patient.emergency_phone}`}
                </p>
              </div>
            )}
            {patient.allergies && patient.allergies.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Alergias</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {patient.allergies.map((allergy: string, idx: number) => (
                    <Badge key={idx} variant="destructive">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Condições Crônicas</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {patient.chronic_conditions.map((condition: string, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <Link href={`/dashboard/agendamentos/novo?patient_id=${patientId}`}>
              <Button variant="outline" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                Nova Consulta
              </Button>
            </Link>
            <Link href={`/dashboard/prontuario/novo?patient_id=${patientId}`}>
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Novo Prontuário
              </Button>
            </Link>
            <Link href={`/dashboard/prescricoes/novo?patient_id=${patientId}`}>
              <Button variant="outline" className="w-full">
                <Pill className="mr-2 h-4 w-4" />
                Nova Prescrição
              </Button>
            </Link>
            <Link href={`/dashboard/exames/novo?patient_id=${patientId}`}>
              <Button variant="outline" className="w-full">
                <FileSearch className="mr-2 h-4 w-4" />
                Novo Exame
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}>{children}</label>
}

