'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  FileText,
  User,
  Calendar,
  Database,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface AuditLog {
  id: string
  user_id?: string
  action: string
  table_name: string
  record_id?: string
  old_values?: any
  new_values?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
  backup: 'bg-purple-500',
  login: 'bg-yellow-500',
  logout: 'bg-gray-500',
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [tableFilter, setTableFilter] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    checkRole()
  }, [router])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadLogs()
      }, 30000) // Atualizar a cada 30 segundos
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  useEffect(() => {
    if (!loading) {
      loadLogs()
    }
  }, [actionFilter, tableFilter, searchQuery])

  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !['admin', 'desenvolvedor'].includes(profile.role)) {
      toast({
        title: 'Acesso Negado',
        description: 'Você não tem permissão para acessar esta página.',
        variant: 'destructive',
      })
      router.push('/dashboard')
      return
    }
    loadLogs()
  }

  const loadLogs = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (actionFilter !== 'all') {
        params.append('action', actionFilter)
      }
      if (tableFilter !== 'all') {
        params.append('table_name', tableFilter)
      }
      params.append('limit', '100')

      const response = await fetch(`/api/admin/audit?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar logs de auditoria')
      }

      const result = await response.json()

      if (result.success && result.data) {
        let filteredLogs = result.data

        // Filtrar por busca se houver
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filteredLogs = filteredLogs.filter(
            (log: AuditLog) =>
              log.action.toLowerCase().includes(query) ||
              log.table_name.toLowerCase().includes(query) ||
              (log.new_values && JSON.stringify(log.new_values).toLowerCase().includes(query)) ||
              (log.old_values && JSON.stringify(log.old_values).toLowerCase().includes(query)) ||
              (log.record_id && log.record_id.toLowerCase().includes(query)) ||
              (log.user_id && log.user_id.toLowerCase().includes(query))
          )
        }

        setLogs(filteredLogs)
      } else {
        setLogs([])
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar logs',
        description: error.message || 'Não foi possível carregar os logs de auditoria',
        variant: 'destructive',
      })
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const handleExportLogs = () => {
    const logText = logs
      .map((log) =>
        `[${format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}] [${log.action.toUpperCase()}] ${log.table_name}${log.record_id ? ` (ID: ${log.record_id})` : ''}${log.user_id ? ` | Usuário: ${log.user_id}` : ''}${log.ip_address ? ` | IP: ${log.ip_address}` : ''}${log.new_values ? ` | Dados: ${JSON.stringify(log.new_values)}` : ''}`
      )
      .join('\n')

    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({
      title: 'Logs exportados',
      description: 'Os logs foram exportados para um arquivo TXT.',
    })
  }

  // Obter lista única de ações e tabelas
  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)))
  const uniqueTables = Array.from(new Set(logs.map((log) => log.table_name)))

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando logs de auditoria...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditoria do Sistema</h1>
          <p className="text-muted-foreground mt-1">
            Visualize todas as ações importantes realizadas no sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAutoRefresh(!autoRefresh)}>
            <RefreshCw className={cn('h-4 w-4 mr-2', autoRefresh && 'animate-spin')} />
            {autoRefresh ? 'Desativar Auto-refresh' : 'Ativar Auto-refresh'}
          </Button>
          <Button variant="outline" onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exportar TXT
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar em logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Ações</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Tabelas</SelectItem>
                {uniqueTables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoria ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-25rem)]">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum log encontrado com os filtros aplicados.
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <Badge className={cn('min-w-[80px]', ACTION_COLORS[log.action] || 'bg-gray-500')}>
                        {log.action}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{log.table_name}</span>
                            {log.record_id && (
                              <span className="text-xs text-muted-foreground">ID: {log.record_id}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                          </span>
                        </div>
                        {log.user_id && (
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Usuário: {log.user_id}</span>
                          </div>
                        )}
                        {log.ip_address && (
                          <div className="text-xs text-muted-foreground mb-2">
                            IP: {log.ip_address}
                          </div>
                        )}
                        {log.new_values && Object.keys(log.new_values).length > 0 && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <strong>Dados:</strong> {JSON.stringify(log.new_values, null, 2)}
                          </div>
                        )}
                        {log.old_values && Object.keys(log.old_values).length > 0 && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            <strong>Valores anteriores:</strong> {JSON.stringify(log.old_values, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

