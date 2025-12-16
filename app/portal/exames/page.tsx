'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function PatientExamesPage() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
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
        .from('exams')
        .select(`
          *,
          doctors:doctor_id (
            id,
            name,
            crm
          ),
          exam_results:exam_results (
            id,
            file_url,
            file_name,
            file_type,
            report
          )
        `)
        .eq('patient_id', patient.id)
        .order('requested_date', { ascending: false })

      if (error) throw error
      setExams(data || [])
    } catch (error) {
      console.error('Erro ao carregar exames:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      requested: 'Solicitado',
      in_progress: 'Em andamento',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Meus Exames</h1>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum exame encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exams.map((exam: any) => (
            <Card key={exam.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{exam.exam_type}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Solicitado em {new Date(exam.requested_date).toLocaleDateString('pt-BR')}
                      {exam.exam_date && ` | Realizado em ${new Date(exam.exam_date).toLocaleDateString('pt-BR')}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Médico: {exam.doctors?.name} - CRM: {exam.doctors?.crm}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{getStatusLabel(exam.status)}</span>
                </div>
              </CardHeader>
              {exam.exam_results && exam.exam_results.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    {exam.exam_results.map((result: any) => (
                      <div key={result.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{result.file_name}</p>
                          {result.report && (
                            <p className="text-sm text-muted-foreground mt-1">{result.report}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(result.file_url, '_blank')}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Baixar
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              {exam.notes && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Observações: {exam.notes}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

