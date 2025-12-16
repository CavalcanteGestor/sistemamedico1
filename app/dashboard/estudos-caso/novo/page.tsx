'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save, Paperclip, X, FileText, Image as ImageIcon, File } from 'lucide-react'

export default function NovoEstudoCasoPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [specialties, setSpecialties] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [pendingFiles, setPendingFiles] = useState<Array<{file: any, description: string}>>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clinical_case: '',
    diagnosis: '',
    treatment: '',
    outcome: '',
    specialty_id: 'none',
    doctor_id: '',
    is_anonymous: false,
    status: 'draft' as 'draft' | 'published' | 'archived',
  })

  useEffect(() => {
    loadSpecialties()
    loadDoctors()
  }, [])

  const loadSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('specialties')
        .select('*')
        .order('name')

      if (error) throw error
      setSpecialties(data || [])
    } catch (error) {
      console.error('Erro ao carregar especialidades:', error)
    }
  }

  const loadDoctors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar o doctor_id do usuário atual
      const { data: doctor, error } = await supabase
        .from('doctors')
        .select('id, name, crm, specialty_id')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (doctor) {
        setDoctors([doctor])
        setFormData((prev) => ({
          ...prev,
          doctor_id: doctor.id,
          specialty_id: doctor.specialty_id || 'none',
        }))
      }
    } catch (error) {
      console.error('Erro ao carregar médico:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.clinical_case.trim()) {
      toast({
        title: 'Erro',
        description: 'Título e caso clínico são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('case_studies')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          clinical_case: formData.clinical_case.trim(),
          diagnosis: formData.diagnosis.trim() || null,
          treatment: formData.treatment.trim() || null,
          outcome: formData.outcome.trim() || null,
          specialty_id: formData.specialty_id && formData.specialty_id !== 'none' ? formData.specialty_id : null,
          doctor_id: formData.doctor_id || null,
          is_anonymous: formData.is_anonymous,
          status: formData.status,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      // Associar arquivos pendentes ao estudo de caso criado
      let uploadedCount = 0
      if (pendingFiles.length > 0 && data.id) {
        const { data: { user } } = await supabase.auth.getUser()
        
        for (const pendingFile of pendingFiles) {
          try {
            // Salvar referência no banco de dados
            const { error: fileError } = await supabase
              .from('case_study_files')
              .insert({
                case_study_id: data.id,
                file_url: pendingFile.file.url,
                file_name: pendingFile.file.fileName,
                file_type: pendingFile.file.fileType,
                file_size: pendingFile.file.fileSize,
                description: pendingFile.description || null,
                uploaded_by: user?.id || null,
              })

            if (!fileError) {
              uploadedCount++
            } else {
              console.error('Erro ao salvar referência do arquivo:', fileError)
            }
          } catch (fileErr) {
            console.error('Erro ao processar arquivo:', fileErr)
          }
        }
      }

      const successMessage = pendingFiles.length > 0
        ? `O estudo de caso foi criado com sucesso${uploadedCount > 0 ? ` e ${uploadedCount} arquivo(s) foi(ram) anexado(s)` : ''}.`
        : 'O estudo de caso foi criado com sucesso.'
      
      toast({
        title: 'Estudo de caso criado',
        description: successMessage,
      })

      router.push(`/dashboard/estudos-caso/${data.id}`)
    } catch (error: any) {
      console.error('Erro ao criar estudo de caso:', error)
      toast({
        title: 'Erro ao criar estudo de caso',
        description: error.message || 'Não foi possível criar o estudo de caso.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/estudos-caso">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Novo Estudo de Caso
        </h1>
        <p className="text-muted-foreground mt-1">
          Crie um novo estudo de caso para compartilhar com outros médicos
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Caso de pneumonia atípica em paciente jovem"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve descrição do caso..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="specialty">Especialidade</Label>
                <Select
                  value={formData.specialty_id}
                  onValueChange={(value) => setFormData({ ...formData, specialty_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty.id} value={specialty.id}>
                        {specialty.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_anonymous"
                checked={formData.is_anonymous}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_anonymous: checked as boolean })
                }
              />
              <Label htmlFor="is_anonymous" className="cursor-pointer">
                Publicar como anônimo
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Caso Clínico <span className="text-red-500">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.clinical_case}
              onChange={(e) => setFormData({ ...formData, clinical_case: e.target.value })}
              placeholder="Descreva o caso clínico em detalhes: anamnese, exame físico, exames complementares..."
              rows={10}
              required
              className="resize-none"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="Descreva o diagnóstico..."
              rows={5}
              className="resize-none"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tratamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              placeholder="Descreva o tratamento realizado..."
              rows={5}
              className="resize-none"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução/Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.outcome}
              onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              placeholder="Descreva a evolução do paciente e o resultado final..."
              rows={5}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Upload de Arquivos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Arquivos (Opcional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Adicionar Arquivos</Label>
              <input
                type="file"
                multiple
                accept="*/*"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  const maxSize = 50 * 1024 * 1024 // 50MB

                  for (const file of files) {
                    if (file.size > maxSize) {
                      toast({
                        title: 'Arquivo muito grande',
                        description: `${file.name} excede o limite de 50MB.`,
                        variant: 'destructive',
                      })
                      continue
                    }

                    // Fazer upload imediatamente para storage temporário
                    try {
                      const uploadFormData = new FormData()
                      uploadFormData.append('file', file)
                      uploadFormData.append('bucket', 'medical-records')
                      uploadFormData.append('folder', 'case-studies/temp')

                      const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: uploadFormData,
                      })

                      if (!response.ok) {
                        throw new Error('Erro ao fazer upload')
                      }

                      const fileData = await response.json()
                      setPendingFiles((prev) => [...prev, { file: fileData, description: '' }])
                      
                      toast({
                        title: 'Arquivo adicionado',
                        description: `${file.name} foi adicionado com sucesso.`,
                      })
                    } catch (error: any) {
                      toast({
                        title: 'Erro ao fazer upload',
                        description: `Não foi possível fazer upload de ${file.name}`,
                        variant: 'destructive',
                      })
                    }
                  }

                  // Limpar input
                  e.target.value = ''
                }}
                className="hidden"
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors"
              >
                <div className="text-center">
                  <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar arquivos ou arraste aqui
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, imagens, documentos (máx. 50MB cada)
                  </p>
                </div>
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                Você pode adicionar arquivos agora ou depois de criar o estudo de caso.
              </p>
            </div>

            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Arquivos selecionados ({pendingFiles.length})</Label>
                <div className="space-y-2">
                  {pendingFiles.map((pendingFile, index) => {
                    const getFileIcon = (fileType: string) => {
                      if (fileType.startsWith('image/')) {
                        return <ImageIcon className="h-4 w-4 text-blue-500" />
                      } else if (fileType === 'application/pdf') {
                        return <FileText className="h-4 w-4 text-red-500" />
                      }
                      return <File className="h-4 w-4 text-gray-500" />
                    }

                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                      >
                        {getFileIcon(pendingFile.file.fileType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {pendingFile.file.fileName}
                          </p>
                          <Input
                            placeholder="Descrição do arquivo (opcional)..."
                            value={pendingFile.description}
                            onChange={(e) => {
                              const updated = [...pendingFiles]
                              updated[index].description = e.target.value
                              setPendingFiles(updated)
                            }}
                            className="mt-1 h-8 text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPendingFiles(pendingFiles.filter((_, i) => i !== index))
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/estudos-caso">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Salvando...' : 'Salvar Estudo de Caso'}
          </Button>
        </div>
      </form>
    </div>
  )
}

