'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import {
  LogOut,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from './logo'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getMenuForRole, type UserRole, type MenuGroup } from '@/lib/menu-config'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadUserRole()
  }, [])

  useEffect(() => {
    // Atualizar grupos abertos quando o pathname mudar
    const newOpen: Record<string, boolean> = { ...openGroups }
    menuGroups.forEach((group) => {
      if (group.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))) {
        newOpen[group.title] = true
      }
    })
    if (Object.keys(newOpen).length > 0) {
      setOpenGroups(newOpen)
    }
  }, [pathname, menuGroups])

  const loadUserRole = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        let role: UserRole
        if (profile.role === 'recepcionista') {
          role = 'secretaria'
        } else if (profile.role === 'admin' || profile.role === 'medico' || profile.role === 'secretaria') {
          role = profile.role as UserRole
        } else {
          router.push('/login')
          return
        }
        
        setUserRole(role)
        const filteredMenu = getMenuForRole(role)
        setMenuGroups(filteredMenu)
        
        // Abrir grupos que contêm a página atual
        const initialOpen: Record<string, boolean> = {}
        filteredMenu.forEach((group) => {
          if (group.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))) {
            initialOpen[group.title] = true
          } else {
            // Abrir por padrão os primeiros grupos
            initialOpen[group.title] = true
          }
        })
        setOpenGroups(initialOpen)
      }
    } catch (error) {
      logger.error('Erro ao carregar role do usuário', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }))
  }

  // Função para verificar se um item do menu está ativo
  const isItemActive = (itemHref: string): boolean => {
    // Dashboard só é ativo se for exatamente /dashboard
    if (itemHref === '/dashboard') {
      return pathname === '/dashboard'
    }
    
    // Para outras páginas, verifica se o pathname começa com o href
    // Mas apenas se for um match exato ou se o próximo caractere for '/'
    if (pathname === itemHref) {
      return true
    }
    
    if (pathname.startsWith(itemHref + '/')) {
      // Verifica todos os itens do menu para ver se há um item mais específico
      let hasMoreSpecificMatch = false
      menuGroups.forEach((group) => {
        group.items.forEach((otherItem) => {
          if (otherItem.href !== itemHref && 
              otherItem.href !== '/dashboard' &&
              otherItem.href.startsWith(itemHref + '/') &&
              pathname.startsWith(otherItem.href)) {
            hasMoreSpecificMatch = true
          }
        })
      })
      // Só está ativo se não houver um item mais específico que também está ativo
      return !hasMoreSpecificMatch
    }
    
    return false
  }

  if (loading) {
    return (
      <div className="flex h-screen w-72 flex-col border-r bg-gradient-to-b from-background to-muted/20">
        <div className="flex h-16 items-center border-b px-6 bg-gradient-to-r from-primary/5 to-background">
          <Logo size="md" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
      <div className="flex h-screen w-72 flex-col border-r bg-gradient-to-b from-background to-muted/20 shadow-lg">
        {/* Header */}
        <div className="flex h-16 items-center border-b px-6 bg-gradient-to-r from-primary/5 to-background">
          <Logo size="md" />
        </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {menuGroups.map((group) => {
          const GroupIcon = group.icon
          const isGroupOpen = openGroups[group.title] ?? true
          
          return (
            <div key={group.title} className="space-y-1 mb-3">
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/60 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  {GroupIcon && (
                    <GroupIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                    {group.title}
                  </h3>
                </div>
                {isGroupOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-all" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-all" />
                )}
              </button>
              
              {isGroupOpen && (
                <div className="space-y-0.5 pl-7 mt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = isItemActive(item.href)
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group relative',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                        )}
                      >
                        <Icon className={cn(
                          'h-4 w-4 flex-shrink-0 transition-all',
                          isActive ? 'scale-110 text-primary-foreground' : 'group-hover:scale-105'
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium leading-tight">{item.title}</div>
                          {item.description && (
                            <div className={cn(
                              'text-xs mt-0.5 truncate transition-colors',
                              isActive 
                                ? 'text-primary-foreground/70' 
                                : 'text-muted-foreground/60 group-hover:text-muted-foreground'
                            )}>
                              {item.description}
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-foreground rounded-r-full opacity-80" />
                        )}
                        {item.badge && (
                          <span className={cn(
                            'px-1.5 py-0.5 text-xs rounded-full font-semibold shrink-0',
                            isActive
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 bg-muted/30 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            className="flex-1 justify-start hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  )
}
