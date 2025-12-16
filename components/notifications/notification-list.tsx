'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface NotificationListProps {
  onRead?: () => void
}

export function NotificationList({ onRead }: NotificationListProps) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadNotifications()

    // Assinar mudanças em tempo real
    const channel = supabase
      .channel('notifications-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error
      await loadNotifications()
      if (onRead) onRead()
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error
      await loadNotifications()
      if (onRead) onRead()
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Carregando notificações...
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notificações</h3>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-4 hover:bg-accent transition-colors',
                  !notification.read && 'bg-primary/5'
                )}
              >
                {notification.link ? (
                  <Link href={notification.link} onClick={() => markAsRead(notification.id)}>
                    <div className="space-y-1">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(notification.created_at), "dd 'de' MMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), "dd 'de' MMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

