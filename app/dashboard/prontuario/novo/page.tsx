'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

function NovoProntuarioContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get('appointment_id')
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [appointment, setAppointment] = useState<any>(null)
  const [patientId, setPatientId] = useState<string>('')
  const [doctorId, setDoctorId] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    loadData()
    if (appointmentId) {
      loadAppointment()
    }
  }, [appointmentId])

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
    }
  }

  const loadAppointment = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients:patient_id (
            id,
            name
          ),
          doctors:doctor_id (
            id,
            name
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (error) throw error
      setAppointment(data)
      if (data) {
        setPatientId(data.patient_id)
        setDoctorId(data.doctor_id)
      }
    } catch (error) {
      console.error('Erro ao carregar agendamento:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      setLoading(true)

      const formData = new FormData(e.currentTarget)
      const patientIdValue = patientId || (formData.get('patient_id') as string)
      const doctorIdValue = doctorId || (formData.get('doctor_id') as string)
      const appointmentIdValue = appointmentId || (formData.get('appointment_id') as string || null)

      // Criar prontuário
      const { data: medicalRecord, error: recordError } = await supabase
        .from('medical_records')
        .insert({
          patient_id: patientIdValue,
          doctor_id: doctorIdValue,
          appointment_id: appointmentIdValue,
        })
        .select()
        .single()

      if (recordError) throw recordError

      toast({
        title: 'Prontuário criado com sucesso!',
        description: 'Você pode agora adicionar informações ao prontuário.',
      })

      router.push(`/dashboard/prontuario/${medicalRecord.id}`)
    } catch (error: any) {
      toast({
        title: 'Erro ao criar prontuário',
        description: error.message || 'Não foi possível criar o prontuário',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link href="/dashboard/prontuario">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Novo Prontuário</CardTitle>
          <CardDescription>
            Crie um novo prontuário eletrônico para um paciente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {appointment ? (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Agendamento Selecionado:</p>
                <p className="text-sm">
                  Paciente: {appointment.patients?.name} | Médico: {appointment.doctors?.name} | 
                  Data: {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
                </p>
                <input type="hidden" name="appointment_id" value={appointment.id} />
                <input type="hidden" name="patient_id" value={appointment.patient_id} />
                <input type="hidden" name="doctor_id" value={appointment.doctor_id} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="patient_id">Paciente *</Label>
                  <Select
                    value={patientId}
                    onValueChange={setPatientId}
                    required
                  >
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
                  <input type="hidden" name="patient_id" value={patientId} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctor_id">Médico *</Label>
                  <Select
                    value={doctorId}
                    onValueChange={setDoctorId}
                    required
                  >
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
                  <input type="hidden" name="doctor_id" value={doctorId} />
                </div>
              </>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Prontuário'}
              </Button>
              <Link href="/dashboard/prontuario">
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

export default function NovoProntuarioPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NovoProntuarioContent />
    </Suspense>
  )
}

