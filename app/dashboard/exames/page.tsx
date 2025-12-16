'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, Download, FileSearch, Filter } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ExamesPage() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadExams()
  }, [statusFilter])

  const loadExams = async () => {
    try {
      setLoading(true)

      // Verificar se é médico para filtrar apenas seus exames
      const { data: { user } } = await supabase.auth.getUser()
      let doctorId: string | null = null

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.role === 'medico') {
          const { data: doctor } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()
          doctorId = doctor?.id || null
        }
      }

      let query = supabase
        .from('exams')
        .select(`
          *,
          patients:patient_id (name, cpf),
          doctors:doctor_id (name, crm)
        `)

      // Se for médico, filtrar apenas seus exames
      if (doctorId) {
        query = query.eq('doctor_id', doctorId)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
        .order('exam_date', { ascending: false })

      if (error) throw error
      setExams(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os exames.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredExams = exams.filter((exam) => {
    const search = searchTerm.toLowerCase()
    return (
      exam.patients?.name?.toLowerCase().includes(search) ||
      exam.patients?.cpf?.includes(search) ||
      exam.exam_type?.toLowerCase().includes(search) ||
      exam.doctors?.name?.toLowerCase().includes(search)
    )
  })

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: string } = {
      scheduled: 'default',
      completed: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
    }
    return variants[status] || 'default'
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      scheduled: 'Agendado',
      completed: 'Concluído',
      pending: 'Pendente',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando exames...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exames</h1>
          <p className="text-muted-foreground">Gerencie todos os exames e laudos médicos</p>
        </div>
        <Link href="/dashboard/exames/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Exame
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, CPF, tipo de exame ou médico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExams.length === 0 ? (
            <div className="text-center py-12">
              <FileSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Nenhum exame encontrado com os filtros aplicados.'
                  : 'Nenhum exame cadastrado ainda.'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Link href="/dashboard/exames/novo">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Exame
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredExams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{exam.exam_type || 'Exame'}</h3>
                      <Badge variant={getStatusBadge(exam.status) as any}>
                        {getStatusLabel(exam.status)}
                      </Badge>
                      <Badge variant="outline">{formatDate(exam.exam_date)}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">Paciente:</span> {exam.patients?.name || 'N/A'}{' '}
                        - CPF: {exam.patients?.cpf || 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Médico solicitante:</span>{' '}
                        {exam.doctors?.name || 'N/A'} {exam.doctors?.crm && `- CRM: ${exam.doctors.crm}`}
                      </p>
                      {exam.notes && (
                        <p className="mt-2 text-xs italic">{exam.notes.substring(0, 100)}...</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/exames/${exam.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </Button>
                    </Link>
                    {exam.status === 'completed' && (
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Laudo
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

