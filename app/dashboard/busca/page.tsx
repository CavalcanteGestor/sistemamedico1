'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  User,
  Calendar,
  FileText,
  Pill,
  FileCheck,
  FileSearch,
  Stethoscope,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'

interface SearchResult {
  type: 'patient' | 'appointment' | 'prescription' | 'exam' | 'medical_record'
  id: string
  title: string
  subtitle: string
  date?: string
  status?: string
  href: string
}

export default function BuscaPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Focar no input quando a página carregar
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Buscar quando o termo mudar (com debounce)
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch(searchTerm.trim())
      } else if (searchTerm.trim().length === 0) {
        setResults([])
        setHasSearched(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const performSearch = async (term: string) => {
    if (term.length < 2) return

    try {
      setLoading(true)
      setHasSearched(true)

      const searchResults: SearchResult[] = []

      // Buscar Pacientes
      const { data: patients } = await supabase
        .from('patients')
        .select('id, name, cpf, phone, email')
        .or(`name.ilike.%${term}%,cpf.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(10)

      if (patients) {
        patients.forEach((patient) => {
          searchResults.push({
            type: 'patient',
            id: patient.id,
            title: patient.name,
            subtitle: patient.cpf ? `CPF: ${patient.cpf}` : patient.phone || patient.email || '',
            href: `/dashboard/pacientes/${patient.id}`,
          })
        })
      }

      // Buscar Agendamentos
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          patients:patient_id (name),
          doctors:doctor_id (name)
        `)
        .or(`notes.ilike.%${term}%`)
        .limit(10)

      if (appointments) {
        appointments.forEach((apt: any) => {
          if (apt.patients?.name?.toLowerCase().includes(term.toLowerCase()) ||
              apt.doctors?.name?.toLowerCase().includes(term.toLowerCase())) {
            searchResults.push({
              type: 'appointment',
              id: apt.id,
              title: `Consulta - ${apt.patients?.name || 'Paciente'}`,
              subtitle: `${apt.doctors?.name || 'Médico'} - ${format(new Date(apt.appointment_date), 'dd/MM/yyyy', { locale: ptBR })} às ${apt.appointment_time}`,
              date: apt.appointment_date,
              status: apt.status,
              href: `/dashboard/agendamentos`,
            })
          }
        })
      }

      // Buscar Prescrições
      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select(`
          id,
          prescription_date,
          notes,
          patients:patient_id (name),
          doctors:doctor_id (name)
        `)
        .or(`notes.ilike.%${term}%`)
        .limit(10)

      if (prescriptions) {
        prescriptions.forEach((presc: any) => {
          if (presc.patients?.name?.toLowerCase().includes(term.toLowerCase()) ||
              presc.doctors?.name?.toLowerCase().includes(term.toLowerCase()) ||
              presc.notes?.toLowerCase().includes(term.toLowerCase())) {
            searchResults.push({
              type: 'prescription',
              id: presc.id,
              title: `Prescrição - ${presc.patients?.name || 'Paciente'}`,
              subtitle: `${presc.doctors?.name || 'Médico'} - ${format(new Date(presc.prescription_date), 'dd/MM/yyyy', { locale: ptBR })}`,
              date: presc.prescription_date,
              href: `/dashboard/prescricoes`,
            })
          }
        })
      }

      // Buscar Exames
      const { data: exams } = await supabase
        .from('exams')
        .select(`
          id,
          exam_type,
          requested_date,
          status,
          notes,
          patients:patient_id (name),
          doctors:doctor_id (name)
        `)
        .or(`exam_type.ilike.%${term}%,notes.ilike.%${term}%`)
        .limit(10)

      if (exams) {
        exams.forEach((exam: any) => {
          if (exam.patients?.name?.toLowerCase().includes(term.toLowerCase()) ||
              exam.doctors?.name?.toLowerCase().includes(term.toLowerCase()) ||
              exam.exam_type?.toLowerCase().includes(term.toLowerCase())) {
            searchResults.push({
              type: 'exam',
              id: exam.id,
              title: `${exam.exam_type} - ${exam.patients?.name || 'Paciente'}`,
              subtitle: `${exam.doctors?.name || 'Médico'} - ${format(new Date(exam.requested_date), 'dd/MM/yyyy', { locale: ptBR })}`,
              date: exam.requested_date,
              status: exam.status,
              href: `/dashboard/exames`,
            })
          }
        })
      }

      // Buscar Prontuários
      const { data: medicalRecords } = await supabase
        .from('medical_records')
        .select(`
          id,
          created_at,
          patients:patient_id (name),
          doctors:doctor_id (name)
        `)
        .limit(10)

      if (medicalRecords) {
        medicalRecords.forEach((record: any) => {
          if (record.patients?.name?.toLowerCase().includes(term.toLowerCase()) ||
              record.doctors?.name?.toLowerCase().includes(term.toLowerCase())) {
            searchResults.push({
              type: 'medical_record',
              id: record.id,
              title: `Prontuário - ${record.patients?.name || 'Paciente'}`,
              subtitle: `${record.doctors?.name || 'Médico'} - ${format(new Date(record.created_at), 'dd/MM/yyyy', { locale: ptBR })}`,
              date: record.created_at,
              href: `/dashboard/prontuario/${record.id}`,
            })
          }
        })
      }

      setResults(searchResults)
    } catch (error: any) {
      console.error('Erro na busca:', error)
      toast({
        title: 'Erro na busca',
        description: 'Não foi possível realizar a busca.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'patient':
        return <User className="h-5 w-5" />
      case 'appointment':
        return <Calendar className="h-5 w-5" />
      case 'prescription':
        return <Pill className="h-5 w-5" />
      case 'exam':
        return <FileSearch className="h-5 w-5" />
      case 'medical_record':
        return <FileText className="h-5 w-5" />
      default:
        return <Search className="h-5 w-5" />
    }
  }

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'patient':
        return 'Paciente'
      case 'appointment':
        return 'Agendamento'
      case 'prescription':
        return 'Prescrição'
      case 'exam':
        return 'Exame'
      case 'medical_record':
        return 'Prontuário'
      default:
        return 'Item'
    }
  }

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'patient':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'appointment':
        return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'prescription':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'exam':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      case 'medical_record':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  const handleResultClick = (result: SearchResult) => {
    router.push(result.href)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Busca Global</h1>
        <p className="text-muted-foreground mt-1">
          Busque em pacientes, agendamentos, prescrições, exames e prontuários
        </p>
      </div>

      {/* Barra de Busca */}
      <Card className="border-2 border-primary/30 shadow-lg">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Digite para buscar (mínimo 2 caracteres)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 h-14 text-lg"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
              </div>
            )}
          </div>
          {searchTerm.length > 0 && searchTerm.length < 2 && (
            <p className="text-sm text-muted-foreground mt-2 ml-4">
              Digite pelo menos 2 caracteres para buscar
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>
              Resultados da Busca
              {results.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Buscando...</p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Nenhum resultado encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente usar termos diferentes ou verifique a ortografia
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent hover:border-primary/30 cursor-pointer transition-all group"
                  >
                    <div className={`p-3 rounded-lg ${getTypeColor(result.type)} border`}>
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold group-hover:text-primary transition-colors">
                          {result.title}
                        </p>
                        <Badge variant="outline" className={getTypeColor(result.type)}>
                          {getTypeLabel(result.type)}
                        </Badge>
                        {result.status && (
                          <Badge variant="secondary" className="text-xs">
                            {result.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                      {result.date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(result.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dicas de Busca */}
      {!hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>Dicas de Busca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Pacientes</p>
                  <p className="text-sm text-muted-foreground">
                    Busque por nome, CPF, telefone ou email
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Agendamentos</p>
                  <p className="text-sm text-muted-foreground">
                    Busque por paciente, médico ou observações
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Pill className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Prescrições</p>
                  <p className="text-sm text-muted-foreground">
                    Busque por paciente, médico ou notas
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileSearch className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Exames</p>
                  <p className="text-sm text-muted-foreground">
                    Busque por tipo de exame, paciente ou médico
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

