/**
 * Serviço de Notificações Push
 * Suporta Web Push API (navegador) e pode ser estendido para mobile
 */

'use client'

import { useState, useEffect } from 'react'

interface PushNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  data?: any
  actions?: Array<{ action: string; title: string; icon?: string }>
}

class PushNotificationService {
  private permission: NotificationPermission = 'default'

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined') {
      return 'default'
    }
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações push')
      return 'denied'
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission()
    }

    return this.permission
  }

  async sendNotification(options: PushNotificationOptions): Promise<Notification | null> {
    if (typeof window === 'undefined') {
      return null
    }
    if (!('Notification' in window)) {
      return null
    }

    if (this.permission === 'default') {
      this.permission = await this.requestPermission()
    }

    if (this.permission !== 'granted') {
      console.warn('Permissão para notificações não concedida')
      return null
    }

    const notificationOptions: NotificationOptions = {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      data: options.data,
    }

    return new Notification(options.title, notificationOptions)
  }

  async sendTelemedicineNotification(appointmentId: string, patientName: string): Promise<void> {
    await this.sendNotification({
      title: 'Consulta de Telemedicina',
      body: `O médico iniciou a consulta com ${patientName}. Clique para entrar.`,
      tag: `telemedicine-${appointmentId}`,
      requireInteraction: true,
      data: {
        type: 'telemedicine',
        appointmentId,
        url: `/telemedicina/${appointmentId}`,
      },
      actions: [
        {
          action: 'open',
          title: 'Entrar na Consulta',
        },
        {
          action: 'dismiss',
          title: 'Fechar',
        },
      ],
    })
  }

  async sendAppointmentReminder(appointmentDate: string, appointmentTime: string): Promise<void> {
    await this.sendNotification({
      title: 'Lembrete de Consulta',
      body: `Você tem uma consulta agendada para ${appointmentDate} às ${appointmentTime}`,
      tag: 'appointment-reminder',
      requireInteraction: false,
    })
  }

  async sendNewMessageNotification(senderName: string, message: string): Promise<void> {
    await this.sendNotification({
      title: `Nova mensagem de ${senderName}`,
      body: message.substring(0, 100),
      tag: 'new-message',
      requireInteraction: true,
      icon: '/favicon.ico',
    })
  }

  getPermission(): NotificationPermission {
    if (typeof window === 'undefined') {
      return 'default'
    }
    if (!('Notification' in window)) {
      return 'denied'
    }
    return this.permission || Notification.permission
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false
    }
    return 'Notification' in window && 'serviceWorker' in navigator
  }
}

// Exportar instância singleton
export const pushNotificationService = new PushNotificationService()

// Hook React para usar notificações
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPermission(pushNotificationService.getPermission())
      setIsSupported(pushNotificationService.isSupported())
    }
  }, [])

  const requestPermission = async () => {
    const result = await pushNotificationService.requestPermission()
    setPermission(result)
    return result
  }

  const sendNotification = async (options: PushNotificationOptions) => {
    return await pushNotificationService.sendNotification(options)
  }

  return {
    requestPermission,
    sendNotification,
    permission,
    isSupported,
    sendTelemedicineNotification: pushNotificationService.sendTelemedicineNotification.bind(pushNotificationService),
    sendAppointmentReminder: pushNotificationService.sendAppointmentReminder.bind(pushNotificationService),
    sendNewMessageNotification: pushNotificationService.sendNewMessageNotification.bind(pushNotificationService),
  }
}

