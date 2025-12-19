'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Mail, Loader2 } from 'lucide-react'
import type { Doctor } from '@/types'

export default function MedicosPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set())
  const [cooldowns, setCooldowns] = useState<Map<string, number>>(new Map())
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadDoctors()
  }, [])

  const loadDoctors = async () => {
    try {
      // Usar helper para buscar apenas médicos com login válido
      const { getAvailableDoctors } = await import('@/lib/utils/doctor-helpers')
      
      // Buscar todos os médicos (incluindo inativos) para mostrar na lista
      const allDoctorsWithLogin = await getAvailableDoctors(supabase, { active: undefined, includeInactive: true })
      
      // Buscar também médicos sem login para mostrar aviso
      const { data: allDoctors } = await supabase
        .from('doctors')
        .select(`
          *,
          specialties:specialty_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (allDoctors) {
        // Marcar quais médicos têm login
        const doctorsWithLoginIds = new Set(allDoctorsWithLogin.map(d => d.id))
        const doctorsWithStatus = allDoctors.map(doctor => ({
          ...doctor,
          hasLogin: doctorsWithLoginIds.has(doctor.id),
        }))
        setDoctors(doctorsWithStatus)
      }
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

  // Atualizar cooldowns a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const newMap = new Map(prev)
        let updated = false
        
        newMap.forEach((seconds, doctorId) => {
          if (seconds > 0) {
            newMap.set(doctorId, seconds - 1)
            updated = true
          } else {
            newMap.delete(doctorId)
            updated = true
          }
        })
        
        return updated ? newMap : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleResendEmail = async (doctorId: string, doctorName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Verificar se está em cooldown
    if (cooldowns.has(doctorId) && (cooldowns.get(doctorId) || 0) > 0) {
      const remaining = cooldowns.get(doctorId) || 0
      toast({
        title: 'Aguarde antes de reenviar',
        description: `Você pode reenviar o email em ${remaining} segundo(s).`,
        variant: 'destructive',
      })
      return
    }

    try {
      setSendingEmails(prev => new Set(prev).add(doctorId))

      const response = await fetch('/api/doctors/resend-invite-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doctorId }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429 && data.cooldownSeconds) {
          // Rate limit atingido
          setCooldowns(prev => new Map(prev).set(doctorId, data.cooldownSeconds))
          toast({
            title: 'Aguarde antes de reenviar',
            description: data.message || `Você pode reenviar o email em ${data.cooldownSeconds} segundo(s).`,
            variant: 'destructive',
          })
        } else {
          throw new Error(data.error || 'Erro ao reenviar email')
        }
        return
      }

      // Sucesso - definir cooldown de 60 segundos
      setCooldowns(prev => new Map(prev).set(doctorId, 60))

      toast({
        title: '✅ Email reenviado!',
        description: `Email de convite foi reenviado para ${doctorName}.`,
        duration: 5000,
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao reenviar email',
        description: error.message || 'Não foi possível reenviar o email.',
        variant: 'destructive',
      })
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev)
        newSet.delete(doctorId)
        return newSet
      })
    }
  }

  // Verificar se usuário tem permissão para reenviar emails
  const [canResendEmail, setCanResendEmail] = useState(false)

  useEffect(() => {
    const checkPermission = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        
        if (profile && ['admin', 'recepcionista', 'desenvolvedor'].includes(profile.role)) {
          setCanResendEmail(true)
        }
      }
    }
    checkPermission()
  }, [supabase])

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
              {filteredDoctors.map((doctor: any) => {
                const isSending = sendingEmails.has(doctor.id)
                const cooldownSeconds = cooldowns.get(doctor.id) || 0
                const canResend = canResendEmail && doctor.hasLogin && doctor.email && cooldownSeconds === 0

                return (
                  <div
                    key={doctor.id}
                    className="group flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <Link
                      href={`/dashboard/medicos/${doctor.id}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{doctor.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            CRM: {doctor.crm} | {doctor.specialties?.name || 'Sem especialidade'} | {doctor.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          {doctor.hasLogin ? (
                            <div className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Com Login
                            </div>
                          ) : (
                            <div className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                              Sem Login
                            </div>
                          )}
                          <div className={`px-2 py-1 rounded text-xs ${doctor.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                            {doctor.active ? 'Ativo' : 'Inativo'}
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    {canResendEmail && doctor.hasLogin && doctor.email && (
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleResendEmail(doctor.id, doctor.name, e)}
                          disabled={isSending || cooldownSeconds > 0}
                          className="whitespace-nowrap"
                        >
                          {isSending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : cooldownSeconds > 0 ? (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Aguarde {cooldownSeconds}s
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Reenviar Email
                            </>
                          )}
                        </Button>
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

