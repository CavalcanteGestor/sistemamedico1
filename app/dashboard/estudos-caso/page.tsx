'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, FileText, User, MessageSquare, Calendar, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function EstudosCasoPage() {
  const [caseStudies, setCaseStudies] = useState<any[]>([])
  const [specialties, setSpecialties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    loadCaseStudies()
    loadSpecialties()
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

  const loadCaseStudies = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Usar API route server-side para evitar problemas de RLS
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (specialtyFilter !== 'all') {
        params.append('specialty', specialtyFilter)
      }

      const response = await fetch(`/api/case-studies?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      })

      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type')
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        console.error('Erro ao buscar estudos de caso:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Resposta do servidor:', errorText)
        setCaseStudies([])
        return
      }

      const result = await response.json()
      
      if (result.error) {
        console.error('Erro na API:', {
          error: result.error,
          details: result.details,
          code: result.code,
        })
        setCaseStudies([])
        return
      }

      setCaseStudies(result.caseStudies || [])
    } catch (error: any) {
      console.error('Erro ao carregar estudos de caso:', {
        message: error.message,
        stack: error.stack,
        error: error,
      })
      setCaseStudies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCaseStudies()
  }, [statusFilter, specialtyFilter])

  const filteredCaseStudies = caseStudies.filter((study) =>
    study.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    study.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    study.clinical_case?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando estudos de caso...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            Estudos de Caso
          </h1>
          <p className="text-muted-foreground mt-1">
            Compartilhe e discuta casos clínicos com outros médicos
          </p>
        </div>
        <Link href="/dashboard/estudos-caso/novo">
          <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
            <Plus className="mr-2 h-4 w-4" />
            Novo Estudo de Caso
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, descrição ou conteúdo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="published">Publicados</SelectItem>
                <SelectItem value="draft">Rascunhos</SelectItem>
                <SelectItem value="archived">Arquivados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Especialidades</SelectItem>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Estudos de Caso */}
      {filteredCaseStudies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              Nenhum estudo de caso encontrado
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' || specialtyFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Seja o primeiro a compartilhar um caso clínico interessante'}
            </p>
            {!searchTerm && statusFilter === 'all' && specialtyFilter === 'all' && (
              <Link href="/dashboard/estudos-caso/novo">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Estudo de Caso
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCaseStudies.map((study) => (
            <Card 
              key={study.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <Link href={`/dashboard/estudos-caso/${study.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{study.title}</CardTitle>
                        <Badge 
                          variant={
                            study.status === 'published' 
                              ? 'default' 
                              : study.status === 'draft'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {study.status === 'published' 
                            ? 'Publicado' 
                            : study.status === 'draft'
                            ? 'Rascunho'
                            : 'Arquivado'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">
                        {study.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>
                        {study.is_anonymous 
                          ? 'Anônimo' 
                          : study.doctor?.name || study.created_by_profile?.name || 'Médico'}
                        {study.doctor?.crm && !study.is_anonymous && ` - ${study.doctor.crm}`}
                      </span>
                    </div>
                    {study.specialty && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{study.specialty.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{study.comments?.length || 0} comentários</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{study.files?.length || 0} arquivos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(study.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

