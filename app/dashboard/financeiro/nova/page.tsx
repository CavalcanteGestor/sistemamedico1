'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NovaTransacaoPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('dinheiro')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [installments, setInstallments] = useState(1)
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [selectedPatient])

  const loadData = async () => {
    try {
      const [patientsRes] = await Promise.all([
        supabase.from('patients').select('id, name').order('name'),
      ])

      if (patientsRes.error) throw patientsRes.error
      setPatients(patientsRes.data || [])

      if (selectedPatient) {
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select('id, appointment_date, appointment_time')
          .eq('patient_id', selectedPatient)
          .order('appointment_date', { ascending: false })

        if (appointmentsError) throw appointmentsError
        setAppointments(appointmentsData || [])
      } else {
        setAppointments([])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description || !amount) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha a descrição e o valor.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      const totalAmount = parseFloat(amount)
      const installmentAmount = totalAmount / installments
      const transactions = []

      // Se for parcelado (cartão com mais de 1 parcela)
      if (paymentMethod === 'cartao' && installments > 1) {
        // Criar múltiplas transações (parcelas)
        for (let i = 0; i < installments; i++) {
          const dueDate = new Date(firstDueDate)
          dueDate.setMonth(dueDate.getMonth() + i)
          
          transactions.push({
            patient_id: selectedPatient && selectedPatient !== 'none' ? selectedPatient : null,
            appointment_id: selectedAppointment && selectedAppointment !== 'none' ? selectedAppointment : null,
            transaction_type: type,
            amount: installmentAmount.toFixed(2),
            payment_method: paymentMethod,
            description: `${description} - ${i + 1}/${installments}`,
            due_date: dueDate.toISOString().split('T')[0],
            paid_date: i === 0 && type === 'income' ? transactionDate : null,
            installments: installments,
            installment_number: i + 1,
            notes: notes || null,
          })
        }
      } else {
        // Transação única
        transactions.push({
          patient_id: selectedPatient && selectedPatient !== 'none' ? selectedPatient : null,
          appointment_id: selectedAppointment && selectedAppointment !== 'none' ? selectedAppointment : null,
          transaction_type: type,
          amount: totalAmount,
          payment_method: paymentMethod,
          description: description,
          due_date: transactionDate,
          paid_date: type === 'income' ? transactionDate : null,
          installments: 1,
          installment_number: 1,
          notes: notes || null,
        })
      }

      const { error } = await supabase.from('financial_transactions').insert(transactions)

      if (error) throw error

      toast({
        title: 'Transação criada com sucesso!',
        description: installments > 1 
          ? `${installments} parcelas criadas no sistema.`
          : 'A transação foi cadastrada no sistema.',
      })

      router.push('/dashboard/financeiro')
    } catch (error: any) {
      toast({
        title: 'Erro ao criar transação',
        description: error.message || 'Não foi possível criar a transação',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/financeiro">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Nova Transação Financeira</CardTitle>
          <CardDescription>
            Registre uma nova receita ou despesa no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Transação *</Label>
              <Select
                value={type}
                onValueChange={(value: 'income' | 'expense') => setType(value)}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  placeholder="Ex: Consulta médica, Material médico"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Forma de Pagamento *</Label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={(value) => {
                    setPaymentMethod(value)
                    if (value !== 'cartao') {
                      setInstallments(1)
                    }
                  }} 
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="convenio">Convênio</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_date">Data da Transação *</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {paymentMethod === 'cartao' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installments">Número de Parcelas *</Label>
                  <Input
                    id="installments"
                    type="number"
                    min="1"
                    max="12"
                    value={installments}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1
                      setInstallments(Math.min(Math.max(value, 1), 12))
                    }}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    {installments > 1 && amount && (
                      <>Valor por parcela: R$ {(parseFloat(amount) / installments).toFixed(2)}</>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="first_due_date">Data da Primeira Parcela *</Label>
                  <Input
                    id="first_due_date"
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    required
                  />
                  {installments > 1 && (
                    <p className="text-sm text-muted-foreground">
                      Última parcela: {(() => {
                        const lastDate = new Date(firstDueDate)
                        lastDate.setMonth(lastDate.getMonth() + installments - 1)
                        return lastDate.toLocaleDateString('pt-BR')
                      })()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === 'cartao' && installments > 1 && (
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">Resumo das Parcelas</h4>
                  <div className="space-y-1 text-sm">
                    {Array.from({ length: installments }).map((_, index) => {
                      const parcelDate = new Date(firstDueDate)
                      parcelDate.setMonth(parcelDate.getMonth() + index)
                      return (
                        <div key={index} className="flex justify-between">
                          <span>
                            Parcela {index + 1}/{installments} - Vencimento: {parcelDate.toLocaleDateString('pt-BR')}
                          </span>
                          <span className="font-medium">
                            R$ {amount ? (parseFloat(amount) / installments).toFixed(2) : '0.00'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Paciente (Opcional)</Label>
                <Select
                  value={selectedPatient ? selectedPatient : 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setSelectedPatient('')
                      setSelectedAppointment('')
                    } else {
                      setSelectedPatient(value)
                      setSelectedAppointment('')
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appointment_id">Agendamento (Opcional)</Label>
                <Select
                  value={selectedAppointment ? selectedAppointment : 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setSelectedAppointment('')
                    } else {
                      setSelectedAppointment(value)
                    }
                  }}
                  disabled={!selectedPatient}
                >
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={selectedPatient ? "Selecione o agendamento (opcional)" : "Selecione primeiro um paciente"} 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {appointments.map((appointment) => (
                      <SelectItem key={appointment.id} value={appointment.id}>
                        {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às{' '}
                        {appointment.appointment_time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações adicionais sobre a transação"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Transação'}
              </Button>
              <Link href="/dashboard/financeiro">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

