/**
 * Serviço de Notificações Push
 * Suporta Web Push API (navegador) e pode ser estendido para mobile
 */

interface PushNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  data?: any
  actions?: NotificationAction[]
}

class PushNotificationService {
  private permission: NotificationPermission = 'default'

  async requestPermission(): Promise<NotificationPermission> {
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
      actions: options.actions,
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
    if (!('Notification' in window)) {
      return 'denied'
    }
    return this.permission || Notification.permission
  }

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator
  }
}

// Exportar instância singleton
export const pushNotificationService = new PushNotificationService()

// Hook React para usar notificações
export function usePushNotifications() {
  const requestPermission = async () => {
    return await pushNotificationService.requestPermission()
  }

  const sendNotification = async (options: PushNotificationOptions) => {
    return await pushNotificationService.sendNotification(options)
  }

  const permission = pushNotificationService.getPermission()
  const isSupported = pushNotificationService.isSupported()

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

