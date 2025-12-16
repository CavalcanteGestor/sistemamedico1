'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  TrendingUp,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Users,
  MessageSquare,
  Repeat,
  ArrowLeft,
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function FollowUpDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('30')
  const [stats, setStats] = useState({
    total: 0,
    pendente: 0,
    enviado: 0,
    cancelado: 0,
    falhou: 0,
    comResposta: 0,
    taxaResposta: 0,
    recorrentes: 0,
    agendados: 0,
  })

  const [chartData, setChartData] = useState<any[]>([])
  const [tipoChartData, setTipoChartData] = useState<any[]>([])
  const [evolucaoData, setEvolucaoData] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [period])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Calcular data inicial baseada no período
      let dataInicio: Date | null = null
      if (period !== 'all') {
        const days = parseInt(period)
        dataInicio = subDays(new Date(), days)
      }

      // Query base
      let query = supabase
        .from('follow_ups')
        .select('*')

      if (dataInicio) {
        query = query.gte('criado_em', dataInicio.toISOString())
      }

      const { data: followUps, error } = await query

      if (error) throw error

      // Calcular estatísticas
      const total = followUps?.length || 0
      const pendente = followUps?.filter((f) => f.status === 'pendente').length || 0
      const enviado = followUps?.filter((f) => f.status === 'enviado').length || 0
      const cancelado = followUps?.filter((f) => f.status === 'cancelado').length || 0
      const falhou = followUps?.filter((f) => f.status === 'falhou').length || 0
      const comResposta = followUps?.filter((f) => f.resposta_recebida === true).length || 0
      const taxaResposta = enviado > 0 ? (comResposta / enviado) * 100 : 0
      const recorrentes = followUps?.filter((f) => f.recorrente === true).length || 0
      const agendados = followUps?.filter((f) => f.agendado_para !== null).length || 0

      setStats({
        total,
        pendente,
        enviado,
        cancelado,
        falhou,
        comResposta,
        taxaResposta: Math.round(taxaResposta * 10) / 10,
        recorrentes,
        agendados,
      })

      // Dados para gráfico de status
      setChartData([
        { name: 'Pendente', value: pendente },
        { name: 'Enviado', value: enviado },
        { name: 'Cancelado', value: cancelado },
        { name: 'Falhou', value: falhou },
      ])

      // Dados para gráfico de tipo
      const tiposCount: Record<string, number> = {}
      followUps?.forEach((f) => {
        tiposCount[f.tipo_follow_up] = (tiposCount[f.tipo_follow_up] || 0) + 1
      })

      setTipoChartData(
        Object.entries(tiposCount).map(([name, value]) => ({ name, value }))
      )

      // Dados para evolução temporal (últimos 7 dias)
      const evolucaoMap: Record<string, { enviados: number; respostas: number }> = {}
      const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i)
        const dateStr = format(date, 'yyyy-MM-dd')
        evolucaoMap[dateStr] = { enviados: 0, respostas: 0 }
        return dateStr
      })

      followUps?.forEach((f) => {
        if (f.enviado_em) {
          const dateStr = format(new Date(f.enviado_em), 'yyyy-MM-dd')
          if (evolucaoMap[dateStr]) {
            evolucaoMap[dateStr].enviados++
            if (f.resposta_recebida) {
              evolucaoMap[dateStr].respostas++
            }
          }
        }
      })

      setEvolucaoData(
        ultimos7Dias.map((dateStr) => ({
          data: format(new Date(dateStr), 'dd/MM'),
          Enviados: evolucaoMap[dateStr].enviados,
          Respostas: evolucaoMap[dateStr].respostas,
        }))
      )
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Follow-up</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral e estatísticas dos follow-ups
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => router.push('/dashboard/leads/follow-up')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Follow-ups</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Criados no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.taxaResposta}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.comResposta} de {stats.enviado} enviados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.agendados}</div>
            <p className="text-xs text-muted-foreground">Aguardando envio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recorrentes</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recorrentes}</div>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendente}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviados</p>
                <p className="text-2xl font-bold">{stats.enviado}</p>
              </div>
              <Send className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com Resposta</p>
                <p className="text-2xl font-bold">{stats.comResposta}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Falharam</p>
                <p className="text-2xl font-bold">{stats.falhou}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Quantidade de follow-ups por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
            <CardDescription>Quantidade por tipo de follow-up</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tipoChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolução Temporal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução Temporal (Últimos 7 dias)</CardTitle>
            <CardDescription>Enviados vs Respostas ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolucaoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Enviados" stroke="#8884d8" />
                <Line type="monotone" dataKey="Respostas" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

