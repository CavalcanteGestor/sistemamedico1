'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Eye, Download, FileText, Copy } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function PrescricoesPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadPrescriptions()
  }, [])

  const loadPrescriptions = async () => {
    try {
      setLoading(true)

      // Verificar se é médico para filtrar apenas suas prescrições
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
        .from('prescriptions')
        .select(`
          *,
          patients:patient_id (name, cpf),
          doctors:doctor_id (name, crm)
        `)

      // Se for médico, filtrar apenas suas prescrições
      if (doctorId) {
        query = query.eq('doctor_id', doctorId)
      }

      const { data, error } = await query
        .order('prescription_date', { ascending: false })

      if (error) throw error
      setPrescriptions(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as prescrições.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const search = searchTerm.toLowerCase()
    return (
      prescription.patients?.name?.toLowerCase().includes(search) ||
      prescription.patients?.cpf?.includes(search) ||
      prescription.doctors?.name?.toLowerCase().includes(search)
    )
  })

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando prescrições...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prescrições</h1>
          <p className="text-muted-foreground">Gerencie todas as prescrições médicas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/prescricoes/templates">
            <Button variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </Link>
          <Link href="/dashboard/prescricoes/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Prescrição
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, CPF ou médico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPrescriptions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'Nenhuma prescrição encontrada com os filtros aplicados.'
                  : 'Nenhuma prescrição cadastrada ainda.'}
              </p>
              {!searchTerm && (
                <Link href="/dashboard/prescricoes/novo">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Prescrição
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPrescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {prescription.patients?.name || 'Paciente não encontrado'}
                      </h3>
                      <Badge variant="outline">
                        {formatDate(prescription.prescription_date)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">CPF:</span> {prescription.patients?.cpf || 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Médico:</span> {prescription.doctors?.name || 'N/A'}{' '}
                        {prescription.doctors?.crm && `- CRM: ${prescription.doctors.crm}`}
                      </p>
                      {prescription.notes && (
                        <p className="mt-2 text-xs italic">{prescription.notes.substring(0, 100)}...</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/prescricoes/${prescription.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async (e) => {
                        e.preventDefault()
                        const response = await fetch(`/api/pdf/prescription/${prescription.id}`)
                        if (response.ok) {
                          const blob = await response.blob()
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `receita-${prescription.id}.pdf`
                          document.body.appendChild(a)
                          a.click()
                          window.URL.revokeObjectURL(url)
                          document.body.removeChild(a)
                        }
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar PDF
                    </Button>
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

