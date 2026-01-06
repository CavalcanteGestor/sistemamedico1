'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/toaster'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { FollowUpScheduler } from '@/components/follow-up/follow-up-scheduler'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full lg:w-auto">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-background border-b px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1 flex justify-end">
            <NotificationBell />
          </div>
        </div>

        <div className="container mx-auto p-4 sm:p-6">
          <div className="hidden lg:flex justify-end mb-4">
            <NotificationBell />
          </div>
          {children}
        </div>
      </main>
      <Toaster />
      {/* Scheduler apenas em desenvolvimento - em produção usar cron job */}
      {process.env.NODE_ENV === 'development' && <FollowUpScheduler />}
    </div>
  )
}
