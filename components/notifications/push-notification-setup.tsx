'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, BellOff, CheckCircle2, XCircle } from 'lucide-react'
import { usePushNotifications } from '@/lib/services/push-notification-service'
import { useToast } from '@/hooks/use-toast'

export function PushNotificationSetup() {
  const { requestPermission, permission, isSupported } = usePushNotifications()
  const [isRequesting, setIsRequesting] = useState(false)
  const { toast } = useToast()

  const handleRequestPermission = async () => {
    setIsRequesting(true)
    try {
      const result = await requestPermission()
      
      if (result === 'granted') {
        toast({
          title: 'Notificações ativadas!',
          description: 'Você receberá notificações push quando houver atualizações.',
        })
      } else if (result === 'denied') {
        toast({
          title: 'Notificações bloqueadas',
          description: 'Você bloqueou as notificações. Para ativar, acesse as configurações do navegador.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erro ao solicitar permissão',
        description: 'Não foi possível solicitar permissão para notificações.',
        variant: 'destructive',
      })
    } finally {
      setIsRequesting(false)
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {permission === 'granted' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          Notificações Push
        </CardTitle>
        <CardDescription>
          {permission === 'granted'
            ? 'Você receberá notificações quando houver atualizações importantes.'
            : 'Ative as notificações push para receber atualizações em tempo real.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {permission === 'granted' ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Notificações ativadas</span>
          </div>
        ) : (
          <Button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="w-full"
          >
            {isRequesting ? (
              'Solicitando permissão...'
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Ativar Notificações
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

