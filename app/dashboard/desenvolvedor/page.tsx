'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Code,
  Database,
  Settings,
  Shield,
  Activity,
  Users,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Server,
  FileCode,
  ArrowRight,
  Zap,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * Dashboard específico para Desenvolvedor
 * Super acesso - visão técnica e administrativa completa
 */
export default function DesenvolvedorDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    systemHealth: 'healthy',
    recentErrors: 0,
  })
  const [systemInfo, setSystemInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Verificar se é desenvolvedor
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
        // Desenvolvedor pode ver tudo, mas redirecionar outros
        router.push('/dashboard')
        return
      }

      loadDeveloperDashboard()
    }

    checkRole()
  }, [router])

  const loadDeveloperDashboard = async () => {
    try {
      setLoading(true)

      // Buscar estatísticas do sistema
      const [usersRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('id, role', { count: 'exact' }),
        supabase
          .from('telemedicine_sessions')
          .select('id')
          .eq('status', 'active'),
      ])

      const usersByRole: { [key: string]: number } = {}
      ;(usersRes.data || []).forEach((user: any) => {
        usersByRole[user.role] = (usersByRole[user.role] || 0) + 1
      })

      setStats({
        totalUsers: usersRes.count || 0,
        activeSessions: sessionsRes.data?.length || 0,
        systemHealth: 'healthy', // TODO: Implementar verificação real
        recentErrors: 0, // TODO: Implementar log de erros
      })

      setSystemInfo({
        usersByRole,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Erro ao carregar dashboard desenvolvedor:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium">Carregando dashboard desenvolvedor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header com Badge de Desenvolvedor */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Dashboard Desenvolvedor
            </h1>
            <Badge variant="default" className="bg-purple-600">
              <Code className="h-3 w-3 mr-1" />
              SUPER ACESSO
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            Visão completa do sistema - Acesso total e ferramentas de desenvolvimento
          </p>
        </div>
      </div>

      {/* Alerta de Desenvolvedor */}
      <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-900 dark:text-purple-100">
                Modo Desenvolvedor Ativo
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                Você tem acesso completo ao sistema. Use com responsabilidade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas do Sistema */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
            <Link href="/dashboard/usuarios">
              <Button variant="ghost" size="sm" className="mt-2">
                Ver usuários <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
            <Activity className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">Telemedicina</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
            {stats.systemHealth === 'healthy' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold capitalize">{stats.systemHealth}</div>
            <p className="text-xs text-muted-foreground mt-1">Última verificação: agora</p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros Recentes</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.recentErrors}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimas 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Usuários por Role */}
      {systemInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Usuários por Role</CardTitle>
            <CardDescription>Visão geral dos usuários do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(systemInfo.usersByRole).map(([role, count]) => (
                <div key={role} className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1 capitalize">
                    {role}
                  </p>
                  <p className="text-2xl font-bold">{count as number}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acesso Rápido - Ferramentas de Desenvolvimento */}
      <Card>
        <CardHeader>
          <CardTitle>Ferramentas de Desenvolvimento</CardTitle>
          <CardDescription>Acesso rápido a ferramentas administrativas e técnicas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/usuarios">
              <Button variant="default" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Usuários
              </Button>
            </Link>
            <Link href="/dashboard/configuracoes">
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </Link>
            <Link href="/dashboard/relatorios">
              <Button variant="outline" className="w-full">
                <Database className="h-4 w-4 mr-2" />
                Relatórios
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Dashboard Admin
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Acesso Completo - Todos os Dashboards */}
      <Card>
        <CardHeader>
          <CardTitle>Acesso Completo ao Sistema</CardTitle>
          <CardDescription>Você pode acessar qualquer dashboard e funcionalidade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/admin">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Dashboard Admin
              </Button>
            </Link>
            <Link href="/dashboard/medico">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="h-4 w-4 mr-2" />
                Dashboard Médico
              </Button>
            </Link>
            <Link href="/dashboard/recepcionista">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Dashboard Recepcionista
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full justify-start">
                <FileCode className="h-4 w-4 mr-2" />
                Dashboard Padrão
              </Button>
            </Link>
            <Link href="/portal/dashboard">
              <Button variant="outline" className="w-full justify-start">
                <Eye className="h-4 w-4 mr-2" />
                Portal do Paciente
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Informações Técnicas */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-purple-600" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ambiente:</span>
              <span className="font-semibold">
                {typeof window !== 'undefined' 
                  ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                      ? 'development' 
                      : 'production')
                  : 'production'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última atualização:</span>
              <span className="font-semibold">
                {systemInfo?.timestamp ? new Date(systemInfo.timestamp).toLocaleString('pt-BR') : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role:</span>
              <Badge variant="default" className="bg-purple-600">desenvolvedor</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

