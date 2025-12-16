'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  Edit, 
  User, 
  Calendar, 
  MessageSquare, 
  Paperclip, 
  FileText,
  Download,
  Trash2,
  Plus,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CaseStudyComments } from '@/components/case-study/case-study-comments'
import { CaseStudyFiles } from '@/components/case-study/case-study-files'

export default function CaseStudyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const caseStudyId = params.id as string
  const [caseStudy, setCaseStudy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAuthor, setIsAuthor] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (caseStudyId) {
      loadCaseStudy()
      loadCurrentUser()
    }
  }, [caseStudyId])

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error)
    }
  }

  const loadCaseStudy = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('case_studies')
        .select(`
          *,
          doctor:doctor_id (
            id,
            name,
            crm,
            specialty_id
          ),
          specialty:specialty_id (
            id,
            name
          )
        `)
        .eq('id', caseStudyId)
        .single()

      if (error) {
        console.error('Erro ao carregar estudo de caso:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        throw error
      }

      // Buscar perfil do criador separadamente
      let createdByProfile = null
      if (data?.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('id', data.created_by)
          .single()
        createdByProfile = profile
      }

      setCaseStudy({
        ...data,
        created_by_profile: createdByProfile,
      })
      setIsAuthor(data?.created_by === user.id)

      // Verificar se o usuário é admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        setIsAuthor(true)
      }
    } catch (error: any) {
      console.error('Erro ao carregar estudo de caso:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o estudo de caso.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este estudo de caso?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('case_studies')
        .delete()
        .eq('id', caseStudyId)

      if (error) throw error

      toast({
        title: 'Estudo de caso excluído',
        description: 'O estudo de caso foi excluído com sucesso.',
      })

      router.push('/dashboard/estudos-caso')
    } catch (error: any) {
      console.error('Erro ao excluir:', error)
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o estudo de caso.',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando estudo de caso...</div>
      </div>
    )
  }

  if (!caseStudy) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Estudo de caso não encontrado</p>
        <Link href="/dashboard/estudos-caso">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Estudos de Caso
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link href="/dashboard/estudos-caso">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {caseStudy.title}
            </h1>
            <Badge 
              variant={
                caseStudy.status === 'published' 
                  ? 'default' 
                  : caseStudy.status === 'draft'
                  ? 'secondary'
                  : 'outline'
              }
            >
              {caseStudy.status === 'published' 
                ? 'Publicado' 
                : caseStudy.status === 'draft'
                ? 'Rascunho'
                : 'Arquivado'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>
                {caseStudy.is_anonymous 
                  ? 'Anônimo' 
                  : caseStudy.doctor?.name || caseStudy.created_by_profile?.name || 'Médico'}
                {caseStudy.doctor?.crm && !caseStudy.is_anonymous && ` - ${caseStudy.doctor.crm}`}
              </span>
            </div>
            {caseStudy.specialty && (
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{caseStudy.specialty.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(caseStudy.created_at), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
        {isAuthor && (
          <div className="flex gap-2">
            <Link href={`/dashboard/estudos-caso/${caseStudyId}/editar`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </Link>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="comments">
            Comentários
          </TabsTrigger>
          <TabsTrigger value="files">
            Arquivos
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* Descrição */}
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {caseStudy.description}
              </p>
            </CardContent>
          </Card>

          {/* Caso Clínico */}
          <Card>
            <CardHeader>
              <CardTitle>Caso Clínico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-muted-foreground">
                {caseStudy.clinical_case}
              </div>
            </CardContent>
          </Card>

          {/* Diagnóstico */}
          {caseStudy.diagnosis && (
            <Card>
              <CardHeader>
                <CardTitle>Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {caseStudy.diagnosis}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tratamento */}
          {caseStudy.treatment && (
            <Card>
              <CardHeader>
                <CardTitle>Tratamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {caseStudy.treatment}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evolução/Resultado */}
          {caseStudy.outcome && (
            <Card>
              <CardHeader>
                <CardTitle>Evolução/Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {caseStudy.outcome}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Comentários */}
        <TabsContent value="comments">
          <CaseStudyComments 
            caseStudyId={caseStudyId}
            currentUser={currentUser}
            onUpdate={loadCaseStudy}
          />
        </TabsContent>

        {/* Arquivos */}
        <TabsContent value="files">
          <CaseStudyFiles 
            caseStudyId={caseStudyId}
            isAuthor={isAuthor}
            currentUser={currentUser}
            onUpdate={loadCaseStudy}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

