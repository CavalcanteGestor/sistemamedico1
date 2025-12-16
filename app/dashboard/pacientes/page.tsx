'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, Copy, Check, ExternalLink } from 'lucide-react'
import type { Patient } from '@/types'
import { useToast } from '@/hooks/use-toast'

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*, login_token, login_token_expires_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPatients(data || [])
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLoginLink = (patient: any) => {
    if (!patient.login_token) return null
    const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    return `${appUrl}/login-paciente/${patient.login_token}`
  }

  const copyLoginLink = async (patient: any) => {
    const link = getLoginLink(patient)
    if (!link) {
      toast({
        title: 'Erro',
        description: 'Este paciente não possui link de login. Gere um novo link.',
        variant: 'destructive',
      })
      return
    }

    try {
      await navigator.clipboard.writeText(link)
      setCopiedToken(patient.id)
      toast({
        title: 'Link copiado!',
        description: 'O link de login foi copiado para a área de transferência.',
      })
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o link.',
        variant: 'destructive',
      })
    }
  }

  const generateNewToken = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/generate-login-token`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar link')
      }

      toast({
        title: 'Link gerado!',
        description: 'Um novo link de login foi gerado para este paciente.',
      })

      // Recarregar pacientes
      loadPatients()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível gerar o link',
        variant: 'destructive',
      })
    }
  }

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.cpf.includes(searchTerm) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os pacientes da clínica
          </p>
        </div>
        <Link href="/dashboard/pacientes/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Paciente
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum paciente encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPatients.map((patient: any) => {
                const loginLink = getLoginLink(patient)
                return (
                  <div
                    key={patient.id}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <Link href={`/dashboard/pacientes/${patient.id}`} className="flex-1">
                        <div>
                          <h3 className="font-semibold">{patient.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            CPF: {patient.cpf} | Email: {patient.email} | Tel: {patient.phone}
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 ml-4">
                        {loginLink ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                copyLoginLink(patient)
                              }}
                            >
                              {copiedToken === patient.id ? (
                                <>
                                  <Check className="mr-2 h-4 w-4" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copiar Link
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                window.open(loginLink, '_blank')
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              generateNewToken(patient.id)
                            }}
                          >
                            Gerar Link
                          </Button>
                        )}
                      </div>
                    </div>
                    {loginLink && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground break-all">
                          <strong>Link de Login:</strong> {loginLink}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

