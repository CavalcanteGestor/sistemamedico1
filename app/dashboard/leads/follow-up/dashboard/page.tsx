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
  RefreshCw,
  AlertCircle,
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

// Cores específicas para cada status
const STATUS_COLORS: Record<string, string> = {
  Pendente: '#F59E0B', // Amarelo
  Enviado: '#3B82F6', // Azul
  Cancelado: '#6B7280', // Cinza
  Falhou: '#EF4444', // Vermelho
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

interface ChartDataItem {
  name: string
  value: number
  color?: string
}

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
    agendadosPendentes: 0,
    agendadosAtrasados: 0,
  })
  const [processing, setProcessing] = useState(false)

  const [chartData, setChartData] = useState<ChartDataItem[]>([])
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
      
      // Agendados pendentes (ainda não enviados)
      const agendadosPendentes = followUps?.filter(
        (f) => f.agendado_para !== null && f.status === 'pendente'
      ).length || 0
      
      // Agendados atrasados (data passou mas ainda pendente)
      const now = new Date()
      const agendadosAtrasados = followUps?.filter(
        (f) => 
          f.agendado_para !== null && 
          f.status === 'pendente' &&
          new Date(f.agendado_para) <= now
      ).length || 0

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
        agendadosPendentes,
        agendadosAtrasados,
      })

      // Dados para gráfico de status - filtrar valores zero para melhor visualização
      const statusData = [
        { name: 'Pendente', value: pendente, color: STATUS_COLORS.Pendente },
        { name: 'Enviado', value: enviado, color: STATUS_COLORS.Enviado },
        { name: 'Cancelado', value: cancelado, color: STATUS_COLORS.Cancelado },
        { name: 'Falhou', value: falhou, color: STATUS_COLORS.Falhou },
      ].filter(item => item.value > 0) // Remover valores zero
      
      setChartData(statusData)

      // Dados para gráfico de tipo com labels legíveis
      const TIPO_LABELS: Record<string, string> = {
        reativacao: 'Reativação',
        promocao: 'Promoção',
        lembrete_consulta: 'Lembrete de Consulta',
        orcamento: 'Orçamento não respondido',
        pos_consulta: 'Follow-up Pós-consulta',
        confirmacao: 'Confirmação de Presença',
        reagendamento: 'Reagendamento',
        oferta: 'Oferta Personalizada',
      }

      const tiposCount: Record<string, number> = {}
      followUps?.forEach((f) => {
        tiposCount[f.tipo_follow_up] = (tiposCount[f.tipo_follow_up] || 0) + 1
      })

      setTipoChartData(
        Object.entries(tiposCount)
          .map(([name, value]) => ({ 
            name: TIPO_LABELS[name] || name, 
            value,
            originalName: name 
          }))
          .sort((a, b) => b.value - a.value) // Ordenar por valor decrescente
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

  const handleProcessScheduled = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/follow-up/process-scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()
      if (result.success) {
        // Recarregar dados
        await loadDashboardData()
        
        // Mostrar toast com resultado
        const { agendados, recorrentes } = result.data
        const totalProcessados = agendados.sent + recorrentes.sent
        const totalFalharam = agendados.failed + recorrentes.failed
        
        if (totalProcessados > 0) {
          // Toast será mostrado pelo sistema
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      console.error('Erro ao processar:', error)
    } finally {
      setProcessing(false)
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
          <Button 
            variant="default" 
            onClick={handleProcessScheduled}
            disabled={processing}
            title="Processar follow-ups agendados agora"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
            {processing ? 'Processando...' : 'Processar Agendados'}
          </Button>
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
            <CardTitle className="text-sm font-medium">Agendados Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.agendadosPendentes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.agendadosAtrasados > 0 && (
                <span className="text-red-500 font-medium">
                  {stats.agendadosAtrasados} atrasado{stats.agendadosAtrasados > 1 ? 's' : ''}
                </span>
              )}
              {stats.agendadosAtrasados === 0 && 'Aguardando envio'}
            </p>
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

      {/* Alerta de agendados atrasados */}
      {stats.agendadosAtrasados > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="font-medium text-red-900 dark:text-red-100">
                  {stats.agendadosAtrasados} follow-up{stats.agendadosAtrasados > 1 ? 's' : ''} agendado{stats.agendadosAtrasados > 1 ? 's' : ''} atrasado{stats.agendadosAtrasados > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Clique em "Processar Agendados" para enviar agora
                </p>
              </div>
              <Button 
                variant="default" 
                onClick={handleProcessScheduled}
                disabled={processing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
                Processar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>Nenhum dado para exibir</p>
              </div>
            ) : chartData.length === 1 ? (
              // Se houver apenas um status, mostrar gráfico de barra simples
              <div className="space-y-4">
                <div className="flex items-center justify-center h-[250px]">
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">{chartData[0].value}</div>
                    <div className="text-lg text-muted-foreground">{chartData[0].name}</div>
                    <div className="text-sm text-muted-foreground mt-1">100% do total</div>
                  </div>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => {
                      // Só mostrar label se a porcentagem for maior que 5%
                      if (percent < 0.05) return ''
                      return `${name}\n${value} (${(percent * 100).toFixed(1)}%)`
                    }}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value} follow-up${value !== 1 ? 's' : ''}`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => {
                      const item = chartData.find(d => d.name === value)
                      return `${value} (${item?.value || 0})`
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
            <CardDescription>Quantidade por tipo de follow-up</CardDescription>
          </CardHeader>
          <CardContent>
            {tipoChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>Nenhum dado para exibir</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={tipoChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => [
                      `${value} follow-up${value !== 1 ? 's' : ''}`,
                      'Quantidade'
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#3B82F6"
                    radius={[8, 8, 0, 0]}
                  >
                    {tipoChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
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
              <LineChart 
                data={evolucaoData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="data" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value} ${name.toLowerCase()}`,
                    name
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Enviados" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Respostas" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

