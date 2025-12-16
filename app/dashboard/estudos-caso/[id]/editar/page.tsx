'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { ArrowLeft, Save } from 'lucide-react'

export default function EditarEstudoCasoPage() {
  const params = useParams()
  const router = useRouter()
  const caseStudyId = params.id as string
  const supabase = createClient()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [specialties, setSpecialties] = useState<any[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clinical_case: '',
    diagnosis: '',
    treatment: '',
    outcome: '',
    specialty_id: '',
    is_anonymous: false,
    status: 'draft' as 'draft' | 'published' | 'archived',
  })

  useEffect(() => {
    if (caseStudyId) {
      loadCaseStudy()
      loadSpecialties()
    }
  }, [caseStudyId])

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

  const loadCaseStudy = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('case_studies')
        .select('*')
        .eq('id', caseStudyId)
        .single()

      if (error) throw error

      setFormData({
        title: data.title || '',
        description: data.description || '',
        clinical_case: data.clinical_case || '',
        diagnosis: data.diagnosis || '',
        treatment: data.treatment || '',
        outcome: data.outcome || '',
        specialty_id: data.specialty_id || 'none',
        is_anonymous: data.is_anonymous || false,
        status: data.status || 'draft',
      })
    } catch (error: any) {
      console.error('Erro ao carregar estudo de caso:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o estudo de caso.',
        variant: 'destructive',
      })
      router.push('/dashboard/estudos-caso')
    } finally {
      setLoading(false)
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
      setSaving(true)

      const { error } = await supabase
        .from('case_studies')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          clinical_case: formData.clinical_case.trim(),
          diagnosis: formData.diagnosis.trim() || null,
          treatment: formData.treatment.trim() || null,
          outcome: formData.outcome.trim() || null,
          specialty_id: formData.specialty_id && formData.specialty_id !== 'none' ? formData.specialty_id : null,
          is_anonymous: formData.is_anonymous,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseStudyId)

      if (error) throw error

      toast({
        title: 'Estudo de caso atualizado',
        description: 'O estudo de caso foi atualizado com sucesso.',
      })

      router.push(`/dashboard/estudos-caso/${caseStudyId}`)
    } catch (error: any) {
      console.error('Erro ao atualizar estudo de caso:', error)
      toast({
        title: 'Erro ao atualizar estudo de caso',
        description: error.message || 'Não foi possível atualizar o estudo de caso.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando estudo de caso...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/dashboard/estudos-caso/${caseStudyId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Editar Estudo de Caso
        </h1>
        <p className="text-muted-foreground mt-1">
          Edite as informações do estudo de caso
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

        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/estudos-caso/${caseStudyId}`}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}

