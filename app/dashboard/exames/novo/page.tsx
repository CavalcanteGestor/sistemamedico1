'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NovoExamePage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [examType, setExamType] = useState('')
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('scheduled')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        supabase.from('patients').select('id, name').order('name'),
        supabase.from('doctors').select('id, name, crm').eq('active', true).order('name'),
      ])

      if (patientsRes.error) throw patientsRes.error
      if (doctorsRes.error) throw doctorsRes.error

      setPatients(patientsRes.data || [])
      setDoctors(doctorsRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPatient || !selectedDoctor || !examType) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.from('exams').insert({
        patient_id: selectedPatient,
        doctor_id: selectedDoctor,
        exam_type: examType,
        requested_date: new Date().toISOString().split('T')[0],
        exam_date: examDate,
        status: status,
        notes: notes || null,
      })

      if (error) throw error

      toast({
        title: 'Exame criado com sucesso!',
        description: 'O exame foi cadastrado no sistema.',
      })

      router.push('/dashboard/exames')
    } catch (error: any) {
      toast({
        title: 'Erro ao criar exame',
        description: error.message || 'Não foi possível criar o exame',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/exames">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Novo Exame</CardTitle>
          <CardDescription>Solicite um novo exame para um paciente</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Paciente *</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctor_id">Médico Solicitante *</Label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o médico" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name} - CRM: {doctor.crm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam_type">Tipo de Exame *</Label>
                <Input
                  id="exam_type"
                  placeholder="Ex: Hemograma completo, Raio-X, Ultrassom"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exam_date">Data do Exame *</Label>
                <Input
                  id="exam_date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={setStatus} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações sobre o exame"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Exame'}
              </Button>
              <Link href="/dashboard/exames">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

