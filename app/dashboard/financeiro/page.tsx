'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, TrendingUp, TrendingDown, DollarSign, Filter } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    pendingIncome: 0,
    pendingExpense: 0,
  })
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadFinancialData()
  }, [typeFilter])

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          patients:patient_id (name),
          appointments:appointment_id (id)
        `)
        .order('created_at', { ascending: false })

      if (typeFilter !== 'all') {
        query = query.eq('transaction_type', typeFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao carregar transações:', error)
        throw error
      }

      setTransactions(data || [])

      // Calcular estatísticas - apenas transações pagas ou vencidas
      const currentDate = new Date()
      const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      
      const income = data?.filter((t) => {
        if (t.transaction_type !== 'income') return false
        // Se já foi pago, contar
        if (t.paid_date) return true
        // Se a data de vencimento já passou, contar como recebido
        if (t.due_date && new Date(t.due_date) <= today) return true
        return false
      }).reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0

      const expense = data?.filter((t) => {
        if (t.transaction_type !== 'expense') return false
        // Se já foi pago, contar
        if (t.paid_date) return true
        // Se a data de vencimento já passou, contar como pago
        if (t.due_date && new Date(t.due_date) <= today) return true
        return false
      }).reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0

      // Calcular receitas/despesas pendentes (futuras)
      const pendingIncome = data?.filter((t) => {
        if (t.transaction_type !== 'income') return false
        return !t.paid_date && t.due_date && new Date(t.due_date) > today
      }).reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0

      const pendingExpense = data?.filter((t) => {
        if (t.transaction_type !== 'expense') return false
        return !t.paid_date && t.due_date && new Date(t.due_date) > today
      }).reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0

      setStats({
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        pendingIncome,
        pendingExpense,
      })

      // Dados mensais para gráfico - considerar todas as parcelas futuras
      const monthly: { [key: string]: { receitas: number; despesas: number; receitasPrevistas: number; despesasPrevistas: number } } = {}
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        monthly[monthKey] = { receitas: 0, despesas: 0, receitasPrevistas: 0, despesasPrevistas: 0 }
      }

      data?.forEach((t: any) => {
        // Usar due_date para alocar a transação no mês correto
        const transactionDate = t.due_date || t.paid_date || t.created_at
        const date = new Date(transactionDate)
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        
        if (monthly[monthKey]) {
          const amount = Number(t.amount) || 0
          const isPaid = !!t.paid_date || (t.due_date && new Date(t.due_date) <= today)
          
          if (t.transaction_type === 'income') {
            if (isPaid) {
              monthly[monthKey].receitas += amount
            } else {
              monthly[monthKey].receitasPrevistas += amount
            }
          } else {
            if (isPaid) {
              monthly[monthKey].despesas += amount
            } else {
              monthly[monthKey].despesasPrevistas += amount
            }
          }
        }
      })

      setMonthlyData(
        Object.entries(monthly).map(([month, data]) => ({
          month,
          receitas: data.receitas,
          despesas: data.despesas,
          receitasPrevistas: data.receitasPrevistas,
          despesasPrevistas: data.despesasPrevistas,
        }))
      )
    } catch (error: any) {
      console.error('Erro ao carregar dados financeiros:', error)
      toast({
        title: 'Erro ao carregar dados',
        description: error.message || 'Não foi possível carregar os dados financeiros.',
        variant: 'destructive',
      })
      setTransactions([])
      setStats({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        pendingIncome: 0,
        pendingExpense: 0,
      })
      setMonthlyData([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const search = searchTerm.toLowerCase()
    return (
      transaction.patients?.name?.toLowerCase().includes(search) ||
      transaction.description?.toLowerCase().includes(search) ||
      transaction.amount?.toString().includes(search)
    )
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  // Data de hoje para comparações
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando dados financeiros...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Gestão financeira da clínica</p>
        </div>
        <Link href="/dashboard/financeiro/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </Link>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas Recebidas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">Total recebido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas Previstas</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.pendingIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground">A receber</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground">Total pago</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Previstas</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.pendingExpense || 0)}
            </div>
            <p className="text-xs text-muted-foreground">A pagar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                stats.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(stats.balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Projeção: {formatCurrency(stats.balance + (stats.pendingIncome || 0) - (stats.pendingExpense || 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="incomePredictedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="expensePredictedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FCA5A5" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#F87171" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar 
                dataKey="receitas" 
                fill="url(#incomeGradient)" 
                name="Receitas Recebidas"
                radius={[8, 8, 0, 0]}
                stroke="#059669"
                strokeWidth={1}
              />
              <Bar 
                dataKey="despesas" 
                fill="url(#expenseGradient)" 
                name="Despesas Pagas"
                radius={[8, 8, 0, 0]}
                stroke="#DC2626"
                strokeWidth={1}
              />
              {monthlyData.some((d) => (d.receitasPrevistas || 0) > 0 || (d.despesasPrevistas || 0) > 0) && (
                <>
                  <Bar 
                    dataKey="receitasPrevistas" 
                    fill="url(#incomePredictedGradient)" 
                    name="Receitas Previstas"
                    radius={[8, 8, 0, 0]}
                    stroke="#3B82F6"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                  />
                  <Bar 
                    dataKey="despesasPrevistas" 
                    fill="url(#expensePredictedGradient)" 
                    name="Despesas Previstas"
                    radius={[8, 8, 0, 0]}
                    stroke="#F87171"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, paciente ou valor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma transação encontrada.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">
                        {transaction.description}
                        {transaction.installments > 1 && (
                          <span className="text-muted-foreground text-sm ml-2">
                            ({transaction.installment_number}/{transaction.installments})
                          </span>
                        )}
                      </h3>
                      <Badge variant={transaction.transaction_type === 'income' ? 'default' : 'secondary'}>
                        {transaction.transaction_type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                      <Badge variant="outline">
                        {formatDate(transaction.due_date || transaction.paid_date || transaction.created_at)}
                      </Badge>
                      {transaction.due_date && new Date(transaction.due_date).setHours(0, 0, 0, 0) > today.getTime() && !transaction.paid_date && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Pendente
                        </Badge>
                      )}
                      {transaction.paid_date && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Pago
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {transaction.patients && (
                        <p>
                          <span className="font-medium">Paciente:</span> {transaction.patients.name}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Forma de pagamento:</span>{' '}
                        {transaction.payment_method === 'cartao' ? 'Cartão' :
                         transaction.payment_method === 'dinheiro' ? 'Dinheiro' :
                         transaction.payment_method === 'pix' ? 'PIX' :
                         transaction.payment_method === 'convenio' ? 'Convênio' :
                         transaction.payment_method === 'transferencia' ? 'Transferência' :
                         transaction.payment_method || 'N/A'}
                        {transaction.installments > 1 && ` • ${transaction.installments}x`}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-xl font-bold ${
                      transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.transaction_type === 'income' ? '+' : '-'}
                    {formatCurrency(Math.abs(Number(transaction.amount) || 0))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

