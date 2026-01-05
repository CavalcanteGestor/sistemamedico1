'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Users, Video, FileText, Pill, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

interface Statistics {
  totalAppointments: number
  completedAppointments: number
  totalPatients: number
  totalDoctors: number
  totalTelemedicine: number
  totalPrescriptions: number
  totalRevenue: number
  averageConsultationTime: number
}

export default function EstatisticasPage() {
  const supabase = createClient()

  const { data: stats, isLoading } = useQuery<Statistics>({
    queryKey: ['statistics'],
    queryFn: async () => {
      const [
        { count: appointmentsCount },
        { count: completedCount },
        { count: patientsCount },
        { count: doctorsCount },
        { count: telemedicineCount },
        { count: prescriptionsCount },
        { data: financialData },
        { data: telemedicineData },
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('doctors').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('telemedicine_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }),
        supabase.from('financial_transactions').select('amount').eq('type', 'income'),
        supabase.from('telemedicine_sessions').select('duration_seconds').not('duration_seconds', 'is', null),
      ])

      const totalRevenue = financialData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
      const durations = telemedicineData?.map(t => t.duration_seconds || 0).filter(d => d > 0) || []
      const averageTime = durations.length > 0 
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60) 
        : 0

      return {
        totalAppointments: appointmentsCount || 0,
        completedAppointments: completedCount || 0,
        totalPatients: patientsCount || 0,
        totalDoctors: doctorsCount || 0,
        totalTelemedicine: telemedicineCount || 0,
        totalPrescriptions: prescriptionsCount || 0,
        totalRevenue,
        averageConsultationTime: averageTime,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando estatísticas...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total de Consultas',
      value: stats?.totalAppointments || 0,
      icon: Calendar,
      description: `${stats?.completedAppointments || 0} concluídas`,
      color: 'text-blue-600',
    },
    {
      title: 'Pacientes',
      value: stats?.totalPatients || 0,
      icon: Users,
      description: 'Total cadastrado',
      color: 'text-green-600',
    },
    {
      title: 'Médicos',
      value: stats?.totalDoctors || 0,
      icon: Users,
      description: 'Ativos',
      color: 'text-purple-600',
    },
    {
      title: 'Telemedicina',
      value: stats?.totalTelemedicine || 0,
      icon: Video,
      description: 'Sessões realizadas',
      color: 'text-red-600',
    },
    {
      title: 'Prescrições',
      value: stats?.totalPrescriptions || 0,
      icon: Pill,
      description: 'Total emitidas',
      color: 'text-orange-600',
    },
    {
      title: 'Receita Total',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.totalRevenue || 0),
      icon: DollarSign,
      description: 'Total arrecadado',
      color: 'text-emerald-600',
    },
    {
      title: 'Tempo Médio',
      value: `${stats?.averageConsultationTime || 0} min`,
      icon: Clock,
      description: 'Por consulta',
      color: 'text-indigo-600',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Estatísticas de Uso</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral do uso do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

