'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Terminal,
  AlertCircle,
  CheckCircle2,
  Info,
  XCircle,
  Search,
  Download,
  RefreshCw,
  Filter,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: any
  user_id?: string
  route?: string
  error_code?: string
  stack_trace?: string
}

export default function LogsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    checkRole()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [levelFilter, searchQuery])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadLogs()
      }, 10000) // Atualizar a cada 10 segundos
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

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

    if (profile?.role !== 'desenvolvedor') {
      router.push('/dashboard')
      return
    }

    loadLogs()
  }

  const loadLogs = async () => {
    try {
      setLoading(true)
      
      // Buscar logs reais do banco de dados
      const params = new URLSearchParams()
      if (levelFilter !== 'all') {
        params.append('level', levelFilter)
      }
      params.append('limit', '100')
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/admin/system-logs?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar logs')
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        // Converter dados do banco para formato da interface
        const logsData: LogEntry[] = result.data.map((log: any) => ({
          id: log.id,
          timestamp: log.created_at,
          level: log.level as LogEntry['level'],
          message: log.message,
          context: log.context,
          route: log.route,
          user_id: log.user_id,
          error_code: log.error_code,
          stack_trace: log.stack_trace,
        }))
        
        setLogs(logsData)
      } else {
        setLogs([])
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar logs',
        description: error.message || 'Não foi possível carregar os logs do sistema',
        variant: 'destructive',
      })
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warn':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'debug':
        return <Terminal className="h-4 w-4 text-gray-500" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'warn':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Warning</Badge>
      case 'info':
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Info</Badge>
      case 'debug':
        return <Badge variant="outline" className="border-gray-500 text-gray-700">Debug</Badge>
      default:
        return <Badge variant="outline">{level}</Badge>
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      !searchQuery ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.route?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter
    
    return matchesSearch && matchesLevel
  })

  const exportLogs = () => {
    const logText = filteredLogs
      .map((log) => {
        return `[${format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}] [${log.level.toUpperCase()}] ${log.message}${log.route ? ` - ${log.route}` : ''}${log.context ? `\nContext: ${JSON.stringify(log.context, null, 2)}` : ''}`
      })
      .join('\n\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast({
      title: 'Logs exportados',
      description: 'Os logs foram baixados com sucesso.',
    })
  }

  const clearLogs = () => {
    setLogs([])
    toast({
      title: 'Logs limpos',
      description: 'Os logs foram limpos da visualização.',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs do Sistema</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e monitore logs e erros do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-primary text-primary-foreground' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button variant="outline" onClick={loadLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={clearLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por mensagem, rota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Níveis</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs ({filteredLogs.length})</CardTitle>
          <CardDescription>
            Últimos logs do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Terminal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum log encontrado</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getLevelIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getLevelBadge(log.level)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                            </span>
                            {log.route && (
                              <Badge variant="outline" className="text-xs">
                                {log.route}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium break-words">{log.message}</p>
                          {log.error_code && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Código: {log.error_code}
                            </Badge>
                          )}
                          {log.user_id && (
                            <span className="text-xs text-muted-foreground ml-2">
                              Usuário: {log.user_id}
                            </span>
                          )}
                          {(log.context || log.stack_trace) && (
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                Ver detalhes
                              </summary>
                              {log.context && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold mb-1">Contexto:</p>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(log.context, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.stack_trace && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold mb-1">Stack Trace:</p>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                    {log.stack_trace}
                                  </pre>
                                </div>
                              )}
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

