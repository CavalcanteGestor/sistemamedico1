'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'
import type { Doctor } from '@/types'

export default function MedicosPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadDoctors()
  }, [])

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          specialties:specialty_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDoctors(data || [])
    } catch (error) {
      console.error('Erro ao carregar médicos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDoctors = doctors.filter((doctor) =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.crm.includes(searchTerm) ||
    doctor.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Médicos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os médicos da clínica
          </p>
        </div>
        <Link href="/dashboard/medicos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Médico
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CRM ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum médico encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDoctors.map((doctor: any) => (
                <Link
                  key={doctor.id}
                  href={`/dashboard/medicos/${doctor.id}`}
                  className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{doctor.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        CRM: {doctor.crm} | {doctor.specialties?.name || 'Sem especialidade'} | {doctor.email}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${doctor.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {doctor.active ? 'Ativo' : 'Inativo'}
                    </div>
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

