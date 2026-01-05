/**
 * Configuração de menus por role
 * Define quais itens de menu cada tipo de usuário pode ver
 */

import {
  LayoutDashboard,
  Users,
  User,
  UserCheck,
  Calendar,
  FileText,
  FileCheck,
  Pill,
  FileSearch,
  DollarSign,
  BarChart3,
  Settings,
  Bell,
  Stethoscope,
  Video,
  MapPin,
  Search,
  MessageCircle,
  Kanban,
  TrendingUp,
  UserPlus,
  PlusCircle,
  History,
  Sparkles,
  Receipt,
  LucideIcon,
  Home,
  Activity,
  Brain,
  Zap,
  ClipboardList,
} from 'lucide-react'
import { permissions, hasPermission, type UserRole } from './permissions'

// Re-exportar UserRole para uso externo
export type { UserRole }

export interface MenuItem {
  title: string
  href: string
  icon: LucideIcon
  requiredPermission?: string
  badge?: string | number
  description?: string
}

export interface MenuGroup {
  title: string
  items: MenuItem[]
  requiredPermission?: string
  icon?: LucideIcon
}

/**
 * Menu completo do sistema - Estrutura melhorada e organizada
 */
const allMenuGroups: MenuGroup[] = [
  {
    title: 'Início',
    icon: Home,
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        requiredPermission: permissions.view_dashboard,
        description: 'Visão geral do sistema',
      },
      {
        title: 'Notificações',
        href: '/dashboard/notificacoes',
        icon: Bell,
        requiredPermission: permissions.view_notifications,
        description: 'Central de notificações',
      },
      {
        title: 'Busca Global',
        href: '/dashboard/busca',
        icon: Search,
        description: 'Buscar em todo o sistema',
      },
    ],
  },
  {
    title: '🤖 IA & Conversas',
    icon: Brain,
    items: [
      {
        title: 'Leads',
        href: '/dashboard/leads',
        icon: UserPlus,
        requiredPermission: permissions.view_telemedicine,
        description: 'Gestão de leads e prospects',
      },
      {
        title: 'WhatsApp',
        href: '/dashboard/whatsapp',
        icon: MessageCircle,
        requiredPermission: permissions.view_telemedicine,
        description: 'Conversas e mensagens',
      },
      {
        title: 'Funil Kanban',
        href: '/dashboard/leads/funil',
        icon: Kanban,
        requiredPermission: permissions.view_telemedicine,
        description: 'Pipeline visual de vendas',
      },
      {
        title: 'Criar Follow-up',
        href: '/dashboard/leads/follow-up/novo',
        icon: PlusCircle,
        requiredPermission: permissions.view_telemedicine,
        description: 'Nova campanha de follow-up',
      },
      {
        title: 'Dashboard Follow-up',
        href: '/dashboard/leads/follow-up/dashboard',
        icon: Activity,
        requiredPermission: permissions.view_telemedicine,
        description: 'Métricas e estatísticas',
      },
      {
        title: 'Histórico Follow-up',
        href: '/dashboard/leads/follow-up/historico',
        icon: History,
        requiredPermission: permissions.view_telemedicine,
        description: 'Todos os follow-ups enviados',
      },
      {
        title: 'Templates Follow-up',
        href: '/dashboard/leads/follow-up/templates',
        icon: FileText,
        requiredPermission: permissions.view_telemedicine,
        description: 'Gerenciar templates de mensagens',
      },
      {
        title: 'Orçamentos',
        href: '/dashboard/orcamentos',
        icon: Receipt,
        requiredPermission: permissions.view_telemedicine,
        description: 'Gestão de orçamentos',
      },
    ],
  },
  {
    title: '🏥 Clínica',
    icon: Stethoscope,
    items: [
      {
        title: 'Pacientes',
        href: '/dashboard/pacientes',
        icon: Users,
        requiredPermission: permissions.view_patients,
        description: 'Cadastro de pacientes',
      },
      {
        title: 'Médicos',
        href: '/dashboard/medicos',
        icon: UserCheck,
        requiredPermission: permissions.view_doctors,
        description: 'Cadastro de médicos',
      },
      {
        title: 'Agendamentos',
        href: '/dashboard/agendamentos',
        icon: Calendar,
        requiredPermission: permissions.view_appointments,
        description: 'Calendário e agendamentos',
      },
      {
        title: 'Consultas',
        href: '/dashboard/consultas',
        icon: ClipboardList,
        requiredPermission: permissions.view_appointments,
        description: 'Consultas presenciais e online',
      },
      {
        title: 'Telemedicina',
        href: '/dashboard/telemedicina',
        icon: Video,
        requiredPermission: permissions.view_telemedicine,
        description: 'Consultas online',
      },
      {
        title: 'Prontuários',
        href: '/dashboard/prontuario',
        icon: Stethoscope,
        requiredPermission: permissions.view_medical_records,
        description: 'Histórico médico completo',
      },
      {
        title: 'Prescrições',
        href: '/dashboard/prescricoes',
        icon: Pill,
        requiredPermission: permissions.view_prescriptions,
        description: 'Receitas médicas',
      },
      {
        title: 'Atestados',
        href: '/dashboard/atestados',
        icon: FileCheck,
        requiredPermission: permissions.view_attestados,
        description: 'Atestados e declarações',
      },
      {
        title: 'Exames',
        href: '/dashboard/exames',
        icon: FileSearch,
        requiredPermission: permissions.view_exams,
        description: 'Resultados de exames',
      },
      {
        title: 'Estudos de Caso',
        href: '/dashboard/estudos-caso',
        icon: FileText,
        requiredPermission: permissions.view_case_studies,
        description: 'Casos clínicos',
      },
    ],
  },
  {
    title: '⚙️ Administrativo',
    icon: Settings,
    items: [
      {
        title: 'Financeiro',
        href: '/dashboard/financeiro',
        icon: DollarSign,
        requiredPermission: permissions.view_financial,
        description: 'Contas e receitas',
      },
      {
        title: 'Relatórios',
        href: '/dashboard/relatorios',
        icon: BarChart3,
        requiredPermission: permissions.view_reports,
        description: 'Relatórios e análises',
      },
      {
        title: 'Estatísticas',
        href: '/dashboard/estatisticas',
        icon: TrendingUp,
        requiredPermission: permissions.view_reports,
        description: 'Estatísticas de uso do sistema',
      },
      {
        title: 'Salas',
        href: '/dashboard/salas',
        icon: MapPin,
        requiredPermission: permissions.view_rooms,
        description: 'Gerenciar salas e ambientes',
      },
      {
        title: 'Usuários',
        href: '/dashboard/usuarios',
        icon: Users,
        requiredPermission: permissions.manage_settings,
        description: 'Gerenciar usuários do sistema',
      },
      {
        title: 'Configurações',
        href: '/dashboard/configuracoes',
        icon: Settings,
        requiredPermission: permissions.manage_settings,
        description: 'Configurações gerais',
      },
    ],
  },
]

/**
 * Menu específico para secretaria/recepcionista - focado em agendamentos e cadastros
 */
const secretariaMenuGroups: MenuGroup[] = [
  {
    title: 'Início',
    icon: Home,
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard/recepcionista',
        icon: LayoutDashboard,
        description: 'Visão geral de agendamentos e atendimentos',
      },
      {
        title: 'Notificações',
        href: '/dashboard/notificacoes',
        icon: Bell,
        description: 'Central de notificações',
      },
      {
        title: 'Busca Global',
        href: '/dashboard/busca',
        icon: Search,
        description: 'Buscar em todo o sistema',
      },
    ],
  },
  {
    title: '📋 Agendamentos',
    icon: Calendar,
    items: [
      {
        title: 'Agendamentos',
        href: '/dashboard/agendamentos',
        icon: Calendar,
        description: 'Calendário e gerenciamento de consultas',
      },
      {
        title: 'Consultas',
        href: '/dashboard/consultas',
        icon: ClipboardList,
        description: 'Consultas presenciais e online',
      },
      {
        title: 'Telemedicina',
        href: '/dashboard/telemedicina',
        icon: Video,
        description: 'Visualizar sessões de telemedicina',
      },
    ],
  },
  {
    title: '👥 Cadastros',
    icon: Users,
    items: [
      {
        title: 'Pacientes',
        href: '/dashboard/pacientes',
        icon: Users,
        description: 'Cadastrar e gerenciar pacientes',
      },
      {
        title: 'Médicos',
        href: '/dashboard/medicos',
        icon: UserCheck,
        description: 'Visualizar médicos cadastrados',
      },
    ],
  },
  {
    title: '📄 Documentos',
    icon: FileText,
    items: [
      {
        title: 'Prontuários',
        href: '/dashboard/prontuario',
        icon: Stethoscope,
        description: 'Visualizar prontuários médicos',
      },
      {
        title: 'Prescrições',
        href: '/dashboard/prescricoes',
        icon: Pill,
        description: 'Visualizar receitas médicas',
      },
      {
        title: 'Atestados',
        href: '/dashboard/atestados',
        icon: FileCheck,
        description: 'Visualizar atestados',
      },
      {
        title: 'Exames',
        href: '/dashboard/exames',
        icon: FileSearch,
        description: 'Visualizar resultados de exames',
      },
    ],
  },
  {
    title: '⚙️ Administrativo',
    icon: Settings,
    items: [
      {
        title: 'Salas',
        href: '/dashboard/salas',
        icon: MapPin,
        description: 'Gerenciar salas e ambientes',
      },
      {
        title: 'Financeiro',
        href: '/dashboard/financeiro',
        icon: DollarSign,
        description: 'Visualizar finanças',
      },
      {
        title: 'Relatórios',
        href: '/dashboard/relatorios',
        icon: BarChart3,
        description: 'Relatórios e análises',
      },
    ],
  },
]

/**
 * Menu específico para médicos - focado em consultas, pacientes e prontuários
 */
const medicoMenuGroups: MenuGroup[] = [
  {
    title: 'Início',
    icon: Home,
    items: [
      {
        title: 'Dashboard Médico',
        href: '/dashboard/medico',
        icon: LayoutDashboard,
        description: 'Suas consultas e pacientes',
      },
      {
        title: 'Meu Perfil',
        href: '/dashboard/medico/perfil',
        icon: User,
        description: 'Editar seus dados pessoais e WhatsApp',
      },
      {
        title: 'Notificações',
        href: '/dashboard/notificacoes',
        icon: Bell,
        description: 'Central de notificações',
      },
      {
        title: 'Busca Global',
        href: '/dashboard/busca',
        icon: Search,
        description: 'Buscar em todo o sistema',
      },
    ],
  },
  {
    title: '🏥 Clínica',
    icon: Stethoscope,
    items: [
      {
        title: 'Agendamentos',
        href: '/dashboard/agendamentos',
        icon: Calendar,
        description: 'Suas consultas agendadas',
      },
      {
        title: 'Consultas',
        href: '/dashboard/consultas',
        icon: ClipboardList,
        description: 'Consultas presenciais e online',
      },
      {
        title: 'Telemedicina',
        href: '/dashboard/telemedicina',
        icon: Video,
        description: 'Consultas online',
      },
      {
        title: 'Pacientes',
        href: '/dashboard/pacientes',
        icon: Users,
        description: 'Seus pacientes',
      },
      {
        title: 'Prontuários',
        href: '/dashboard/prontuario',
        icon: Stethoscope,
        description: 'Histórico médico completo',
      },
      {
        title: 'Prescrições',
        href: '/dashboard/prescricoes',
        icon: Pill,
        description: 'Receitas médicas',
      },
      {
        title: 'Atestados',
        href: '/dashboard/atestados',
        icon: FileCheck,
        description: 'Atestados e declarações',
      },
      {
        title: 'Exames',
        href: '/dashboard/exames',
        icon: FileSearch,
        description: 'Resultados de exames',
      },
      {
        title: 'Estudos de Caso',
        href: '/dashboard/estudos-caso',
        icon: FileText,
        description: 'Casos clínicos',
      },
    ],
  },
  {
    title: 'Relatórios',
    icon: BarChart3,
    items: [
      {
        title: 'Relatórios',
        href: '/dashboard/relatorios',
        icon: BarChart3,
        description: 'Relatórios e análises',
      },
    ],
  },
]

/**
 * Retorna o menu filtrado por role
 */
export function getMenuForRole(role: UserRole | null): MenuGroup[] {
  if (!role) return []

  // Menu específico para médicos
  if (role === 'medico') {
    return medicoMenuGroups
  }

  // Menu específico para secretaria/recepcionista
  if (role === 'secretaria') {
    return secretariaMenuGroups
  }

  // Menu padrão para admin
  return allMenuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.requiredPermission) return true
        return hasPermission(role, item.requiredPermission)
      }),
    }))
    .filter((group) => group.items.length > 0) // Remove grupos vazios
}
