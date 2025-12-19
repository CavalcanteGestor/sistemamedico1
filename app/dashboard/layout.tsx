import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/toaster'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { FollowUpScheduler } from '@/components/follow-up/follow-up-scheduler'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          <div className="flex justify-end mb-4">
            <NotificationBell />
          </div>
          {children}
        </div>
      </main>
      <Toaster />
      <FollowUpScheduler />
    </div>
  )
}
