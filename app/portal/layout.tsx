import { PatientSidebar } from '@/components/layout/patient-sidebar'
import { Toaster } from '@/components/ui/toaster'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <PatientSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
      <Toaster />
    </div>
  )
}

