'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Pill,
  FileSearch,
  History,
  User,
  LogOut,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const menuGroups = [
  {
    title: 'Principal',
    items: [
      {
        title: 'Dashboard',
        href: '/portal/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Notificações',
        href: '/portal/notificacoes',
        icon: Bell,
      },
    ],
  },
  {
    title: 'Meus Dados',
    items: [
      {
        title: 'Consultas',
        href: '/portal/consultas',
        icon: Calendar,
      },
      {
        title: 'Prescrições',
        href: '/portal/prescricoes',
        icon: Pill,
      },
      {
        title: 'Exames',
        href: '/portal/exames',
        icon: FileSearch,
      },
      {
        title: 'Histórico',
        href: '/portal/historico',
        icon: History,
      },
    ],
  },
  {
    title: 'Conta',
    items: [
      {
        title: 'Perfil',
        href: '/portal/perfil',
        icon: User,
      },
    ],
  },
]

export function PatientSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Portal do Paciente</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </h3>
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )
}

