'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, User, FileText, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function PatientHistoricoPage() {
  const [medicalRecords, setMedicalRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadMedicalRecords()
  }, [])

  const loadMedicalRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Usar API route para evitar erro 406
      const patientRes = await fetch('/api/portal/patient-id', {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      })
      
      // Verificar se a resposta é JSON
      const contentType = patientRes.headers.get('content-type')
      if (!patientRes.ok || !contentType || !contentType.includes('application/json')) {
        console.error('Erro ao buscar patient ID:', patientRes.status)
        return
      }
      
      const { patientId } = await patientRes.json()
      if (!patientId) return
      
      const patient = { id: patientId }

      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          doctors:doctor_id (
            id,
            name,
            crm
          ),
          appointments:appointment_id (
            id,
            appointment_date,
            appointment_time
          )
        `)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMedicalRecords(data || [])
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando histórico...</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Histórico Médico</h1>

      {medicalRecords.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum registro médico encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {medicalRecords.map((record: any) => {
            const appointmentDate = record.appointments?.appointment_date
              ? new Date(record.appointments.appointment_date).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
              : new Date(record.created_at).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })

            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        {appointmentDate}
                        {record.appointments?.appointment_time && (
                          <span className="text-base font-normal text-muted-foreground">
                            às {record.appointments.appointment_time}
                          </span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          <strong>Médico:</strong> {record.doctors?.name} - CRM: {record.doctors?.crm}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Registro criado em {new Date(record.created_at).toLocaleDateString('pt-BR')} às {new Date(record.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Link href={`/portal/prontuario/${record.id}`}>
                      <Button size="sm" variant="default">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}