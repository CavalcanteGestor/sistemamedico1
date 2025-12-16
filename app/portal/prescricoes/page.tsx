'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function PatientPrescricoesPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadPrescriptions()
  }, [])

  const loadPrescriptions = async () => {
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
        .from('prescriptions')
        .select(`
          *,
          doctors:doctor_id (
            id,
            name,
            crm
          ),
          prescription_items:prescription_items (
            id,
            medication_name,
            dosage,
            frequency,
            duration,
            instructions
          )
        `)
        .eq('patient_id', patient.id)
        .order('prescription_date', { ascending: false })

      if (error) throw error
      setPrescriptions(data || [])
    } catch (error) {
      console.error('Erro ao carregar prescrições:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Minhas Prescrições</h1>

      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma prescrição encontrada
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((prescription: any) => (
            <Card key={prescription.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      Prescrição de {new Date(prescription.prescription_date).toLocaleDateString('pt-BR')}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Médico: {prescription.doctors?.name} - CRM: {prescription.doctors?.crm}
                    </p>
                  </div>
                  <a
                    href={`/api/pdf/prescription/${prescription.id}`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Baixar PDF
                    </Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {prescription.prescription_items?.map((item: any) => (
                    <div key={item.id} className="border-l-2 pl-4">
                      <p className="font-semibold">{item.medication_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Dosagem: {item.dosage} | Frequência: {item.frequency} | Duração: {item.duration}
                      </p>
                      {item.instructions && (
                        <p className="text-sm mt-1">{item.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
                {prescription.notes && (
                  <p className="text-sm mt-4 text-muted-foreground">
                    Observações: {prescription.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

