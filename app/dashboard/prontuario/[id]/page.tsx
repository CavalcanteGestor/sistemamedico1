'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnamnesisForm } from '@/components/forms/anamnesis-form'
import { PhysicalExamForm } from '@/components/forms/physical-exam-form'
import { FileUpload } from '@/components/forms/file-upload'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft, Image as ImageIcon, FileText, Download, Trash2, Plus, Edit, Eye } from 'lucide-react'
import type { AnamnesisInput } from '@/lib/validations/anamnesis'
import type { PhysicalExamInput } from '@/lib/validations/physical-exam'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function ProntuarioPage() {
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
  const [saving, setSaving] = useState(false)
  const [editingAnamnesis, setEditingAnamnesis] = useState(false)
  const [editingPhysicalExam, setEditingPhysicalExam] = useState(false)
  const [showNewEvolution, setShowNewEvolution] = useState(false)
  const [newEvolution, setNewEvolution] = useState({ date: '', notes: '' })
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

      // Carregar prontuário
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
        .single()

      if (recordError) throw recordError
      setMedicalRecord(record)

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

  const handleSaveAnamnesis = async (data: AnamnesisInput) => {
    try {
      setSaving(true)

      if (anamnesis) {
        // Atualizar
        const { error } = await supabase
          .from('anamnesis')
          .update(data)
          .eq('id', anamnesis.id)

        if (error) throw error
        toast({
          title: 'Anamnese atualizada com sucesso!',
        })
      } else {
        // Criar
        const { data: newAnamnesis, error } = await supabase
          .from('anamnesis')
          .insert({
            medical_record_id: medicalRecordId,
            ...data,
          })
          .select()
          .single()

        if (error) throw error
        setAnamnesis(newAnamnesis)
        toast({
          title: 'Anamnese salva com sucesso!',
        })
      }

      setEditingAnamnesis(false)
      await loadMedicalRecord()
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar anamnese',
        description: error.message || 'Não foi possível salvar a anamnese',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSavePhysicalExam = async (data: PhysicalExamInput) => {
    try {
      setSaving(true)

      if (physicalExam) {
        // Atualizar
        const { error } = await supabase
          .from('physical_exams')
          .update(data)
          .eq('id', physicalExam.id)

        if (error) throw error
        toast({
          title: 'Exame físico atualizado com sucesso!',
        })
      } else {
        // Criar
        const { data: newPhysicalExam, error } = await supabase
          .from('physical_exams')
          .insert({
            medical_record_id: medicalRecordId,
            ...data,
          })
          .select()
          .single()

        if (error) throw error
        setPhysicalExam(newPhysicalExam)
        toast({
          title: 'Exame físico salvo com sucesso!',
        })
      }

      setEditingPhysicalExam(false)
      await loadMedicalRecord()
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar exame físico',
        description: error.message || 'Não foi possível salvar o exame físico',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEvolution = async () => {
    try {
      if (!newEvolution.date || !newEvolution.notes) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha a data e as observações',
          variant: 'destructive',
        })
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!doctor) throw new Error('Médico não encontrado')

      const { error } = await supabase.from('evolutions').insert({
        medical_record_id: medicalRecordId,
        doctor_id: doctor.id,
        evolution_date: newEvolution.date,
        notes: newEvolution.notes,
      })

      if (error) throw error

      toast({
        title: 'Evolução adicionada com sucesso!',
      })

      setShowNewEvolution(false)
      setNewEvolution({ date: '', notes: '' })
      await loadMedicalRecord()
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar evolução',
        description: error.message || 'Não foi possível adicionar a evolução',
        variant: 'destructive',
      })
    }
  }

  const handlePhotoUpload = async (file: any, photoType: 'before' | 'after') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('medical_record_photos').insert({
        medical_record_id: medicalRecordId,
        file_url: file.url,
        file_name: file.fileName,
        file_type: file.fileType || 'image/jpeg',
        file_size: file.fileSize || 0,
        photo_type: photoType,
        uploaded_by: user?.id || null,
      })

      if (error) throw error

      toast({
        title: 'Foto adicionada com sucesso!',
      })

      await loadMedicalRecord()
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar foto',
        description: error.message || 'Não foi possível adicionar a foto',
        variant: 'destructive',
      })
    }
  }

  const handleDocumentUpload = async (file: any, documentType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('medical_record_documents').insert({
        medical_record_id: medicalRecordId,
        file_url: file.url,
        file_name: file.fileName,
        file_type: file.fileType || 'application/pdf',
        file_size: file.fileSize || 0,
        document_type: documentType,
        uploaded_by: user?.id || null,
      })

      if (error) throw error

      toast({
        title: 'Documento adicionado com sucesso!',
      })

      await loadMedicalRecord()
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar documento',
        description: error.message || 'Não foi possível adicionar o documento',
        variant: 'destructive',
      })
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('medical_record_photos')
        .delete()
        .eq('id', photoId)

      if (error) throw error

      toast({
        title: 'Foto removida com sucesso!',
      })

      await loadMedicalRecord()
    } catch (error: any) {
      toast({
        title: 'Erro ao remover foto',
        description: error.message || 'Não foi possível remover a foto',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('medical_record_documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error

      toast({
        title: 'Documento removido com sucesso!',
      })

      await loadMedicalRecord()
    } catch (error: any) {
      toast({
        title: 'Erro ao remover documento',
        description: error.message || 'Não foi possível remover o documento',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>
  }

  if (!medicalRecord) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Prontuário não encontrado.</p>
        <Link href="/dashboard/prontuario">
          <Button variant="outline" className="mt-4">
            Voltar para Prontuários
          </Button>
        </Link>
      </div>
    )
  }

  const beforePhotos = photos.filter((p) => p.photo_type === 'before')
  const afterPhotos = photos.filter((p) => p.photo_type === 'after')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/prontuario">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Prontuário Eletrônico</h1>
          <p className="text-muted-foreground mt-1">
            Paciente: {medicalRecord.patients?.name} | CPF: {medicalRecord.patients?.cpf}
          </p>
          <p className="text-muted-foreground">
            Médico: {medicalRecord.doctors?.name} - CRM: {medicalRecord.doctors?.crm}
          </p>
        </div>
        <Button
          onClick={async () => {
            try {
              const response = await fetch(`/api/pdf/medical-record/${medicalRecordId}`)
              if (response.ok) {
                const blob = await response.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `prontuario-${medicalRecordId}.pdf`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
                toast({
                  title: 'PDF gerado com sucesso!',
                  description: 'O arquivo está sendo baixado.',
                })
              }
            } catch (error) {
              toast({
                title: 'Erro ao gerar PDF',
                variant: 'destructive',
              })
            }
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <Tabs defaultValue="anamnesis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="anamnesis">Anamnese</TabsTrigger>
          <TabsTrigger value="physical">Exame Físico</TabsTrigger>
          <TabsTrigger value="photos">Fotos Antes/Depois</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="evolutions">Evoluções</TabsTrigger>
        </TabsList>

        <TabsContent value="anamnesis" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Anamnese</CardTitle>
                {!editingAnamnesis && (
                  <Button
                    onClick={() => setEditingAnamnesis(true)}
                    variant={anamnesis ? 'outline' : 'default'}
                  >
                    {anamnesis ? <Edit className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {anamnesis ? 'Editar' : 'Criar'} Anamnese
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingAnamnesis ? (
                <AnamnesisForm
                  initialData={anamnesis}
                  onSubmit={handleSaveAnamnesis}
                  onCancel={() => setEditingAnamnesis(false)}
                  loading={saving}
                />
              ) : anamnesis ? (
                <div className="space-y-4">
                  <div>
                    <Label className="font-semibold">Queixa Principal:</Label>
                    <p className="mt-1">{anamnesis.chief_complaint}</p>
                  </div>
                  {anamnesis.history_of_present_illness && (
                    <div>
                      <Label className="font-semibold">História da Doença Atual:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{anamnesis.history_of_present_illness}</p>
                    </div>
                  )}
                  {anamnesis.past_medical_history && (
                    <div>
                      <Label className="font-semibold">História Patológica Pregressa:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{anamnesis.past_medical_history}</p>
                    </div>
                  )}
                  {anamnesis.family_history && (
                    <div>
                      <Label className="font-semibold">História Familiar:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{anamnesis.family_history}</p>
                    </div>
                  )}
                  {anamnesis.social_history && (
                    <div>
                      <Label className="font-semibold">História Social:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{anamnesis.social_history}</p>
                    </div>
                  )}
                  {anamnesis.medications && anamnesis.medications.length > 0 && (
                    <div>
                      <Label className="font-semibold">Medicações em Uso:</Label>
                      <ul className="mt-1 list-disc list-inside">
                        {anamnesis.medications.map((med: string, idx: number) => (
                          <li key={idx}>{med}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {anamnesis.allergies && anamnesis.allergies.length > 0 && (
                    <div>
                      <Label className="font-semibold">Alergias:</Label>
                      <ul className="mt-1 list-disc list-inside">
                        {anamnesis.allergies.map((allergy: string, idx: number) => (
                          <li key={idx}>{allergy}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma anamnese registrada. Clique em "Criar Anamnese" para adicionar.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="physical" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Exame Físico</CardTitle>
                {!editingPhysicalExam && (
                  <Button
                    onClick={() => setEditingPhysicalExam(true)}
                    variant={physicalExam ? 'outline' : 'default'}
                  >
                    {physicalExam ? <Edit className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {physicalExam ? 'Editar' : 'Criar'} Exame Físico
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingPhysicalExam ? (
                <PhysicalExamForm
                  initialData={physicalExam}
                  onSubmit={handleSavePhysicalExam}
                  onCancel={() => setEditingPhysicalExam(false)}
                  loading={saving}
                />
              ) : physicalExam ? (
                <div className="space-y-4">
                  {physicalExam.vital_signs && Object.keys(physicalExam.vital_signs).length > 0 && (
                    <div>
                      <Label className="font-semibold">Sinais Vitais:</Label>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {physicalExam.vital_signs.blood_pressure_systolic && (
                          <div>
                            <span className="text-muted-foreground">PA:</span>{' '}
                            {physicalExam.vital_signs.blood_pressure_systolic}/
                            {physicalExam.vital_signs.blood_pressure_diastolic} mmHg
                          </div>
                        )}
                        {physicalExam.vital_signs.heart_rate && (
                          <div>
                            <span className="text-muted-foreground">FC:</span>{' '}
                            {physicalExam.vital_signs.heart_rate} bpm
                          </div>
                        )}
                        {physicalExam.vital_signs.respiratory_rate && (
                          <div>
                            <span className="text-muted-foreground">FR:</span>{' '}
                            {physicalExam.vital_signs.respiratory_rate} irpm
                          </div>
                        )}
                        {physicalExam.vital_signs.temperature && (
                          <div>
                            <span className="text-muted-foreground">Temp:</span>{' '}
                            {physicalExam.vital_signs.temperature}°C
                          </div>
                        )}
                        {physicalExam.vital_signs.oxygen_saturation && (
                          <div>
                            <span className="text-muted-foreground">SpO2:</span>{' '}
                            {physicalExam.vital_signs.oxygen_saturation}%
                          </div>
                        )}
                        {physicalExam.vital_signs.blood_glucose && (
                          <div>
                            <span className="text-muted-foreground">Glicemia:</span>{' '}
                            {physicalExam.vital_signs.blood_glucose} mg/dL
                          </div>
                        )}
                        {physicalExam.vital_signs.weight && (
                          <div>
                            <span className="text-muted-foreground">Peso:</span>{' '}
                            {physicalExam.vital_signs.weight} kg
                          </div>
                        )}
                        {physicalExam.vital_signs.height && (
                          <div>
                            <span className="text-muted-foreground">Altura:</span>{' '}
                            {physicalExam.vital_signs.height} cm
                          </div>
                        )}
                        {physicalExam.vital_signs.bmi && (
                          <div>
                            <span className="text-muted-foreground">IMC:</span>{' '}
                            {physicalExam.vital_signs.bmi}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {physicalExam.general_appearance && (
                    <div>
                      <Label className="font-semibold">Aspecto Geral:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{physicalExam.general_appearance}</p>
                    </div>
                  )}
                  {physicalExam.cardiovascular && (
                    <div>
                      <Label className="font-semibold">Cardiovascular:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{physicalExam.cardiovascular}</p>
                    </div>
                  )}
                  {physicalExam.respiratory && (
                    <div>
                      <Label className="font-semibold">Respiratório:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{physicalExam.respiratory}</p>
                    </div>
                  )}
                  {physicalExam.abdominal && (
                    <div>
                      <Label className="font-semibold">Abdome:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{physicalExam.abdominal}</p>
                    </div>
                  )}
                  {physicalExam.neurological && (
                    <div>
                      <Label className="font-semibold">Neurológico:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{physicalExam.neurological}</p>
                    </div>
                  )}
                  {physicalExam.musculoskeletal && (
                    <div>
                      <Label className="font-semibold">Musculoesquelético:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{physicalExam.musculoskeletal}</p>
                    </div>
                  )}
                  {physicalExam.skin && (
                    <div>
                      <Label className="font-semibold">Pele:</Label>
                      <p className="mt-1 whitespace-pre-wrap">{physicalExam.skin}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum exame físico registrado. Clique em "Criar Exame Físico" para adicionar.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Fotos Antes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileUpload
                  bucket="medical-records"
                  folder={`${medicalRecordId}/photos/before`}
                  accept="image/*"
                  maxSize={5}
                  label="Adicionar Foto Antes"
                  onUploadComplete={(file) => handlePhotoUpload(file, 'before')}
                />
                <div className="grid grid-cols-2 gap-2">
                  {beforePhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.file_url}
                        alt={photo.description || 'Foto antes'}
                        className="w-full h-32 object-cover rounded border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeletePhoto(photo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fotos Depois</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileUpload
                  bucket="medical-records"
                  folder={`${medicalRecordId}/photos/after`}
                  accept="image/*"
                  maxSize={5}
                  label="Adicionar Foto Depois"
                  onUploadComplete={(file) => handlePhotoUpload(file, 'after')}
                />
                <div className="grid grid-cols-2 gap-2">
                  {afterPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.file_url}
                        alt={photo.description || 'Foto depois'}
                        className="w-full h-32 object-cover rounded border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeletePhoto(photo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  id="document_type"
                  placeholder="Tipo do documento (ex: Laudo, Receita, Exame)"
                  className="flex-1"
                />
                <FileUpload
                  bucket="medical-records"
                  folder={`${medicalRecordId}/documents`}
                  accept="*/*"
                  maxSize={10}
                  label="Adicionar Documento"
                  onUploadComplete={async (file) => {
                    const docTypeInput = document.getElementById('document_type') as HTMLInputElement
                    const docType = docTypeInput?.value || 'Documento'
                    await handleDocumentUpload(file, docType)
                    if (docTypeInput) docTypeInput.value = ''
                  }}
                />
              </div>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.document_type || 'Documento'}</p>
                        <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Baixar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolutions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Evoluções</CardTitle>
                <Button onClick={() => setShowNewEvolution(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Evolução
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showNewEvolution && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle>Nova Evolução</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="evolution_date">Data *</Label>
                      <Input
                        id="evolution_date"
                        type="date"
                        value={newEvolution.date}
                        onChange={(e) =>
                          setNewEvolution({ ...newEvolution, date: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="evolution_notes">Observações *</Label>
                      <Textarea
                        id="evolution_notes"
                        rows={5}
                        value={newEvolution.notes}
                        onChange={(e) =>
                          setNewEvolution({ ...newEvolution, notes: e.target.value })
                        }
                        placeholder="Descreva a evolução do paciente..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEvolution}>Salvar Evolução</Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowNewEvolution(false)
                          setNewEvolution({ date: '', notes: '' })
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {evolutions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma evolução registrada ainda.
                </p>
              ) : (
                <div className="space-y-4">
                  {evolutions.map((evolution) => (
                    <Card key={evolution.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {new Date(evolution.evolution_date).toLocaleDateString('pt-BR')}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Dr(a). {evolution.doctors?.name} - CRM: {evolution.doctors?.crm}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap">{evolution.notes}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

