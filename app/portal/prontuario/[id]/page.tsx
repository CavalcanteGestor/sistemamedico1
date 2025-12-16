'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft, Download, Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

function PatientProntuarioContent() {
  const params = useParams()
  const router = useRouter()
  const medicalRecordId = params.id as string
  const [medicalRecord, setMedicalRecord] = useState<any>(null)
  const [anamnesis, setAnamnesis] = useState<any>(null)
  const [physicalExam, setPhysicalExam] = useState<any>(null)
  const [evolutions, setEvolutions] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (medicalRecordId) {
      loadMedicalRecord()
    }
  }, [medicalRecordId])

  const loadMedicalRecord = async () => {
    try {
      setLoading(true)

      // Verificar se o usuário é o paciente
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Buscar paciente via API route para evitar erro 406
      const patientRes = await fetch('/api/portal/patient-id', {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      })
      
      // Verificar se a resposta é JSON
      const contentType = patientRes.headers.get('content-type')
      if (!patientRes.ok || patientRes.status === 404 || !contentType || !contentType.includes('application/json')) {
        const errorText = await patientRes.text().catch(() => '')
        console.error('Erro ao buscar patient ID:', patientRes.status, errorText.substring(0, 100))
        toast({
          title: 'Acesso negado',
          description: 'Você não é um paciente cadastrado.',
          variant: 'destructive',
        })
        router.push('/portal/dashboard')
        return
      }
      
      const { patientId } = await patientRes.json()
      if (!patientId) {
        toast({
          title: 'Acesso negado',
          description: 'Você não é um paciente cadastrado.',
          variant: 'destructive',
        })
        router.push('/portal/dashboard')
        return
      }
      
      const patient = { id: patientId }

      // Carregar prontuário com verificação de autorização
      const { data: record, error: recordError } = await supabase
        .from('medical_records')
        .select(`
          *,
          patients:patient_id (
            id,
            name,
            cpf,
            birth_date,
            phone,
            email
          ),
          doctors:doctor_id (
            id,
            name,
            crm,
            email
          ),
          appointments:appointment_id (
            id,
            appointment_date,
            appointment_time
          )
        `)
        .eq('id', medicalRecordId)
        .eq('patient_id', patient.id)
        .single()

      if (recordError || !record) {
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para visualizar este prontuário.',
          variant: 'destructive',
        })
        router.push('/portal/historico')
        return
      }

      setMedicalRecord(record)
      setAuthorized(true)

      // Carregar anamnese
      const { data: anamnesisData } = await supabase
        .from('anamnesis')
        .select('*')
        .eq('medical_record_id', medicalRecordId)
        .single()

      setAnamnesis(anamnesisData)

      // Carregar exame físico
      const { data: physicalExamData } = await supabase
        .from('physical_exams')
        .select('*')
        .eq('medical_record_id', medicalRecordId)
        .single()

      setPhysicalExam(physicalExamData)

      // Carregar evoluções
      const { data: evolutionsData } = await supabase
        .from('evolutions')
        .select(`
          *,
          doctors:doctor_id (
            name,
            crm
          )
        `)
        .eq('medical_record_id', medicalRecordId)
        .order('evolution_date', { ascending: false })

      setEvolutions(evolutionsData || [])

      // Carregar fotos
      const { data: photosData } = await supabase
        .from('medical_record_photos')
        .select('*')
        .eq('medical_record_id', medicalRecordId)
        .order('created_at', { ascending: false })

      setPhotos(photosData || [])

      // Carregar documentos
      const { data: documentsData } = await supabase
        .from('medical_record_documents')
        .select('*')
        .eq('medical_record_id', medicalRecordId)
        .order('created_at', { ascending: false })

      setDocuments(documentsData || [])
    } catch (error: any) {
      console.error('Erro ao carregar prontuário:', error)
      toast({
        title: 'Erro ao carregar prontuário',
        description: error.message || 'Não foi possível carregar o prontuário',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = () => {
    window.open(`/api/pdf/medical-record/${medicalRecordId}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando prontuário...</div>
      </div>
    )
  }

  if (!authorized || !medicalRecord) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Acesso não autorizado.</p>
        <Link href="/portal/historico">
          <Button variant="outline" className="mt-4">
            Voltar para Histórico
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/portal/historico">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <Button onClick={downloadPDF}>
          <Download className="mr-2 h-4 w-4" />
          Baixar PDF do Prontuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Prontuário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Data:</strong>{' '}
                {medicalRecord.appointments?.appointment_date
                  ? new Date(medicalRecord.appointments.appointment_date).toLocaleDateString('pt-BR')
                  : new Date(medicalRecord.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Médico:</strong> {medicalRecord.doctors?.name} - CRM: {medicalRecord.doctors?.crm}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="anamnesis" className="w-full">
        <TabsList>
          <TabsTrigger value="anamnesis">Anamnese</TabsTrigger>
          <TabsTrigger value="physical">Exame Físico</TabsTrigger>
          <TabsTrigger value="evolutions">Evoluções</TabsTrigger>
          {photos.length > 0 && <TabsTrigger value="photos">Fotos ({photos.length})</TabsTrigger>}
          {documents.length > 0 && <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="anamnesis" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Anamnese</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {anamnesis ? (
                <div className="space-y-4">
                  {anamnesis.chief_complaint && (
                    <div>
                      <h4 className="font-semibold mb-2">Queixa Principal</h4>
                      <p className="text-sm text-muted-foreground">{anamnesis.chief_complaint}</p>
                    </div>
                  )}
                  {anamnesis.history_of_present_illness && (
                    <div>
                      <h4 className="font-semibold mb-2">História da Doença Atual</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{anamnesis.history_of_present_illness}</p>
                    </div>
                  )}
                  {anamnesis.past_medical_history && (
                    <div>
                      <h4 className="font-semibold mb-2">História Patológica Pregressa</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{anamnesis.past_medical_history}</p>
                    </div>
                  )}
                  {anamnesis.family_history && (
                    <div>
                      <h4 className="font-semibold mb-2">História Familiar</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{anamnesis.family_history}</p>
                    </div>
                  )}
                  {anamnesis.allergies && anamnesis.allergies.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Alergias</h4>
                      <div className="flex flex-wrap gap-2">
                        {anamnesis.allergies.map((allergy: string, index: number) => (
                          <Badge key={index} variant="outline">{allergy}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {anamnesis.medications && anamnesis.medications.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Medicações em Uso</h4>
                      <div className="space-y-1">
                        {anamnesis.medications.map((med: string, index: number) => (
                          <p key={index} className="text-sm text-muted-foreground">• {med}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma anamnese registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="physical" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Exame Físico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {physicalExam ? (
                <div className="space-y-4">
                  {physicalExam.vital_signs && (
                    <div>
                      <h4 className="font-semibold mb-2">Sinais Vitais</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {physicalExam.vital_signs.pressure && (
                          <div>
                            <p className="text-xs text-muted-foreground">Pressão Arterial</p>
                            <p className="font-medium">{physicalExam.vital_signs.pressure}</p>
                          </div>
                        )}
                        {physicalExam.vital_signs.heart_rate && (
                          <div>
                            <p className="text-xs text-muted-foreground">Frequência Cardíaca</p>
                            <p className="font-medium">{physicalExam.vital_signs.heart_rate} bpm</p>
                          </div>
                        )}
                        {physicalExam.vital_signs.temperature && (
                          <div>
                            <p className="text-xs text-muted-foreground">Temperatura</p>
                            <p className="font-medium">{physicalExam.vital_signs.temperature}°C</p>
                          </div>
                        )}
                        {physicalExam.vital_signs.bmi && (
                          <div>
                            <p className="text-xs text-muted-foreground">IMC</p>
                            <p className="font-medium">{physicalExam.vital_signs.bmi}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {physicalExam.cardiovascular && (
                    <div>
                      <h4 className="font-semibold mb-2">Cardiovascular</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{physicalExam.cardiovascular}</p>
                    </div>
                  )}
                  {physicalExam.respiratory && (
                    <div>
                      <h4 className="font-semibold mb-2">Respiratório</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{physicalExam.respiratory}</p>
                    </div>
                  )}
                  {physicalExam.general_appearance && (
                    <div>
                      <h4 className="font-semibold mb-2">Aspecto Geral</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{physicalExam.general_appearance}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum exame físico registrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolutions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Evoluções Médicas</CardTitle>
            </CardHeader>
            <CardContent>
              {evolutions.length > 0 ? (
                <div className="space-y-4">
                  {evolutions.map((evolution: any) => (
                    <div key={evolution.id} className="border-l-2 pl-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">
                          {new Date(evolution.evolution_date).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {evolution.doctors?.name}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{evolution.notes}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma evolução registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {photos.length > 0 && (
          <TabsContent value="photos" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Fotos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo: any) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.file_url}
                        alt={photo.description || 'Foto do prontuário'}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Badge variant="outline" className="mt-2">
                        {photo.photo_type === 'before' ? 'Antes' : 'Depois'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {documents.length > 0 && (
          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium">{doc.file_name}</p>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        Abrir
                      </Button>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default function PatientProntuarioPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PatientProntuarioContent />
    </Suspense>
  )
}
