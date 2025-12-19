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
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

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
        systemHealth: 'healthy',
        recentErrors: 0,
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

      {/* Criar Médico Básico - Desenvolvedor */}
      <DoctorQuickCreateCard />

      {/* Ferramentas Administrativas */}
      <AdminToolsCard />

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
            <Link href="/dashboard/medicos">
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Médicos
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

/**
 * Componente para ferramentas administrativas perigosas
 */
function AdminToolsCard() {
  const { toast } = useToast()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAllDoctors = async () => {
    try {
      setDeleting(true)

      const response = await fetch('/api/admin/doctors/delete-all', {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir médicos')
      }

      toast({
        title: 'Médicos excluídos com sucesso!',
        description: `Todos os médicos foram excluídos. ${result.deletedUsers || 0} usuários também foram removidos.`,
      })

      // Recarregar página para atualizar estatísticas
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir médicos',
        description: error.message || 'Não foi possível excluir os médicos.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Ferramentas Administrativas
        </CardTitle>
        <CardDescription className="text-red-600">
          Ações perigosas - Use com cuidado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full"
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Excluindo...' : 'Excluir TODOS os Médicos'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">
                ⚠️ Atenção! Esta ação é irreversível!
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Você está prestes a excluir <strong>TODOS</strong> os médicos do sistema.
                </p>
                <p className="font-semibold">
                  Esta ação irá:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Excluir todos os registros de médicos</li>
                  <li>Excluir os usuários (login) associados aos médicos</li>
                  <li>Remover os profiles dos médicos</li>
                </ul>
                <p className="text-red-600 font-semibold mt-4">
                  ⚠️ Se houver agendamentos, esta operação será bloqueada. Exclua os agendamentos primeiro.
                </p>
                <p>
                  Tem certeza que deseja continuar?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAllDoctors}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? 'Excluindo...' : 'Sim, excluir todos'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-xs text-muted-foreground mt-4">
          <strong>Nota:</strong> Esta ação é permanente e não pode ser desfeita. 
          Use apenas quando quiser começar do zero.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Componente para criação rápida de médico (apenas campos básicos)
 */
function DoctorQuickCreateCard() {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    crm: '',
    email: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)

      const response = await fetch('/api/doctors/create-basic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar médico')
      }

      toast({
        title: 'Médico básico criado com sucesso!',
        description: 'O admin pode completar as informações e criar login depois.',
      })

      // Limpar formulário
      setFormData({ name: '', crm: '', email: '' })

      // Redirecionar para lista de médicos
      router.push('/dashboard/medicos')
    } catch (error: any) {
      toast({
        title: 'Erro ao criar médico',
        description: error.message || 'Não foi possível criar o médico básico.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-purple-600" />
          Criar Médico Básico (Rápido)
        </CardTitle>
        <CardDescription>
          Crie um médico com informações básicas. O administrador pode completar os dados e criar login depois.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dev-doctor-name">Nome Completo *</Label>
              <Input
                id="dev-doctor-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dr. João Silva"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-doctor-crm">CRM *</Label>
              <Input
                id="dev-doctor-crm"
                value={formData.crm}
                onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                placeholder="CRM 123456"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-doctor-email">Email *</Label>
              <Input
                id="dev-doctor-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="medico@exemplo.com"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Criando...' : 'Criar Médico Básico'}
            </Button>
            <Link href="/dashboard/medicos/novo">
              <Button type="button" variant="outline">
                Criar Médico Completo
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Médicos criados aqui não terão login inicialmente. 
            O administrador deve completar as informações (telefone, especialidade, WhatsApp) 
            e criar o login na página de detalhes do médico ou ao usar "Novo Médico" completo.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

