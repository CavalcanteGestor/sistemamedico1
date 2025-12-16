'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Stethoscope, Video } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  type: 'appointment'
  status: string
  patientName?: string
  doctorName?: string
}

interface CalendarViewProps {
  events: CalendarEvent[]
  onDateClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
}

export function CalendarView({ events, onDateClick, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter((event) => event.date === dateStr)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
      case 'confirmed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
      case 'completed':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20'
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
      case 'no_show':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Agendada',
      confirmed: 'Confirmada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      no_show: 'Falta',
    }
    return labels[status] || status
  }

  return (
    <Card className="hover-lift">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Calendário de Agendamentos
            </CardTitle>
            <CardDescription className="mt-1">
              Visualize todos os agendamentos em formato de calendário
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Mês
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Semana
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold min-w-[250px] text-center">
              {format(new Date(year, month, 1), "MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {view === 'month' ? (
          <div className="space-y-2">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div 
                  key={day} 
                  className="p-3 text-center font-semibold text-sm text-muted-foreground bg-muted/50 rounded-lg"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grade do calendário */}
            <div className="grid grid-cols-7 gap-2">
              {/* Dias vazios do início */}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square rounded-lg bg-muted/20" />
              ))}

              {/* Dias do mês */}
              {days.map((day) => {
                const dateEvents = getEventsForDate(day)
                const dateObj = new Date(year, month, day)
                const isToday =
                  day === new Date().getDate() &&
                  month === new Date().getMonth() &&
                  year === new Date().getFullYear()

                return (
                  <div
                    key={day}
                    className={`aspect-square border-2 rounded-lg p-2 overflow-y-auto hover:bg-accent transition-all duration-200 cursor-pointer hover:border-primary/50 ${
                      isToday 
                        ? 'border-primary bg-primary/10 shadow-md' 
                        : 'border-border hover:shadow-sm'
                    }`}
                    onClick={() => {
                      if (onDateClick) {
                        onDateClick(dateObj)
                      }
                    }}
                  >
                    <div className={`text-sm font-bold mb-2 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dateEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs p-1.5 rounded-md border truncate cursor-pointer hover:scale-[1.02] transition-transform ${getStatusColor(event.status)}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onEventClick) {
                              onEventClick(event)
                            }
                          }}
                          title={`${event.time} - ${event.patientName || event.title} - ${event.doctorName || ''}`}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="font-semibold">{event.time}</span>
                          </div>
                          <div className="truncate font-medium">
                            {event.patientName || event.title}
                          </div>
                          {event.doctorName && (
                            <div className="text-[10px] opacity-75 truncate">
                              {event.doctorName}
                            </div>
                          )}
                        </div>
                      ))}
                      {dateEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center font-medium pt-1">
                          +{dateEvents.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <WeekView
            currentDate={currentDate}
            events={events}
            onEventClick={onEventClick}
            onNavigate={(direction) => {
              const newDate = new Date(currentDate)
              newDate.setDate(newDate.getDate() + (direction === 'prev' ? -7 : 7))
              setCurrentDate(newDate)
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}

function WeekView({
  currentDate,
  events,
  onEventClick,
  onNavigate,
}: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onNavigate: (direction: 'prev' | 'next') => void
}) {
  const startOfWeek = new Date(currentDate)
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    return day
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getEventsForDayAndHour = (date: Date, hour: number) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter((event) => {
      if (event.date !== dateStr) return false
      const eventHour = parseInt(event.time.split(':')[0])
      return eventHour === hour
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
      case 'confirmed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
      case 'completed':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20'
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
      case 'no_show':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <Button variant="outline" size="sm" onClick={() => onNavigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-base font-bold">
          {format(weekDays[0], "dd 'de' MMMM", { locale: ptBR })} -{' '}
          {format(weekDays[6], "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 gap-px bg-border">
          {/* Cabeçalho */}
          <div className="p-3 bg-muted/50 font-semibold text-sm">Hora</div>
          {weekDays.map((day) => {
            const isToday =
              day.getDate() === new Date().getDate() &&
              day.getMonth() === new Date().getMonth() &&
              day.getFullYear() === new Date().getFullYear()
            
            return (
              <div 
                key={day.toISOString()} 
                className={`p-3 font-semibold text-center ${isToday ? 'bg-primary/10 border-b-2 border-primary' : 'bg-muted/50'}`}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={`text-xl ${isToday ? 'text-primary font-bold' : ''}`}>
                  {day.getDate()}
                </div>
              </div>
            )
          })}

          {/* Grade de horas */}
          {hours.map((hour) => {
            const today = new Date()
            const isCurrentHour = hour === today.getHours()
            
            return (
              <div key={`hour-row-${hour}`} className="contents">
                <div className={`p-2 text-right text-xs font-medium border-r ${isCurrentHour ? 'bg-primary/5' : 'bg-muted/20'}`}>
                  {String(hour).padStart(2, '0')}:00
                </div>
                {weekDays.map((day) => {
                  const dayEvents = getEventsForDayAndHour(day, hour)
                  const isToday =
                    day.getDate() === today.getDate() &&
                    day.getMonth() === today.getMonth() &&
                    day.getFullYear() === today.getFullYear()
                  const isCurrentHourAndDay = isToday && isCurrentHour

                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={`p-1 border-r border-b min-h-[80px] ${
                        isCurrentHourAndDay ? 'bg-primary/10 border-primary/30' : 'bg-background'
                      } hover:bg-accent/50 transition-colors`}
                    >
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs p-2 rounded-md border mb-1 cursor-pointer hover:shadow-md transition-all ${getStatusColor(event.status)}`}
                          onClick={() => onEventClick?.(event)}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="font-bold">{event.time}</span>
                          </div>
                          <div className="font-semibold truncate mb-0.5">
                            {event.patientName || 'Sem nome'}
                          </div>
                          {event.doctorName && (
                            <div className="text-[10px] opacity-75 truncate flex items-center gap-0.5">
                              <Stethoscope className="h-2.5 w-2.5" />
                              {event.doctorName}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

