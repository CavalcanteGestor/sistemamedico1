'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, FileText } from 'lucide-react'

export default function ProntuariosPage() {
  const [medicalRecords, setMedicalRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadMedicalRecords()
  }, [])

  const loadMedicalRecords = async () => {
    try {
      // Verificar se é médico para filtrar apenas seus prontuários
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
        .from('medical_records')
        .select(`
          *,
          patients:patient_id (
            id,
            name,
            cpf
          ),
          doctors:doctor_id (
            id,
            name,
            crm
          ),
          appointments:appointment_id (
            id,
            appointment_date
          )
        `)

      // Se for médico, filtrar apenas seus prontuários
      if (doctorId) {
        query = query.eq('doctor_id', doctorId)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setMedicalRecords(data || [])
    } catch (error) {
      console.error('Erro ao carregar prontuários:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = medicalRecords.filter((record) =>
    record.patients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.patients?.cpf.includes(searchTerm)
  )

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Prontuários Eletrônicos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os prontuários dos pacientes
          </p>
        </div>
        <Link href="/dashboard/prontuario/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Prontuário
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF do paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum prontuário encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <Link
                  key={record.id}
                  href={`/dashboard/prontuario/${record.id}`}
                  className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{record.patients?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        CPF: {record.patients?.cpf} | Médico: {record.doctors?.name} - CRM: {record.doctors?.crm}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Criado em {new Date(record.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

