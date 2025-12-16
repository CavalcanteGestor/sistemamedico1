/**
 * Sistema de Permissões por Role
 * Define o que cada tipo de usuário pode acessar
 */

export type UserRole = 'admin' | 'medico' | 'secretaria'

export interface Permission {
  key: string
  label: string
  description?: string
}

export interface RolePermissions {
  role: UserRole
  permissions: Permission[]
}

/**
 * Permissões por módulo do sistema
 */
export const permissions = {
  // Dashboard e visão geral
  view_dashboard: 'view_dashboard',
  
  // Pessoas
  view_patients: 'view_patients',
  create_patients: 'create_patients',
  edit_patients: 'edit_patients',
  delete_patients: 'delete_patients',
  
  view_doctors: 'view_doctors',
  create_doctors: 'create_doctors',
  edit_doctors: 'edit_doctors',
  delete_doctors: 'delete_doctors',
  
  // Agendamentos
  view_appointments: 'view_appointments',
  create_appointments: 'create_appointments',
  edit_appointments: 'edit_appointments',
  delete_appointments: 'delete_appointments',
  cancel_appointments: 'cancel_appointments',
  
  // Telemedicina
  view_telemedicine: 'view_telemedicine',
  start_telemedicine: 'start_telemedicine',
  
  // Prontuários e Documentos
  view_medical_records: 'view_medical_records',
  create_medical_records: 'create_medical_records',
  edit_medical_records: 'edit_medical_records',
  
  view_prescriptions: 'view_prescriptions',
  create_prescriptions: 'create_prescriptions',
  edit_prescriptions: 'edit_prescriptions',
  
  view_exams: 'view_exams',
  create_exams: 'create_exams',
  edit_exams: 'edit_exams',
  
  view_attestados: 'view_attestados',
  create_attestados: 'create_attestados',
  
  view_case_studies: 'view_case_studies',
  create_case_studies: 'create_case_studies',
  edit_case_studies: 'edit_case_studies',
  delete_case_studies: 'delete_case_studies',
  
  // Administrativo
  view_rooms: 'view_rooms',
  manage_rooms: 'manage_rooms',
  
  view_financial: 'view_financial',
  manage_financial: 'manage_financial',
  
  view_reports: 'view_reports',
  export_reports: 'export_reports',
  
  manage_settings: 'manage_settings',
  manage_users: 'manage_users',
  
  // Notificações
  view_notifications: 'view_notifications',
} as const

/**
 * Mapeamento de permissões por role
 */
export const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    // Admin tem acesso total
    ...Object.values(permissions),
  ],
  
  medico: [
    // Dashboard e visão geral
    permissions.view_dashboard,
    permissions.view_notifications,
    
    // Pessoas - apenas visualizar
    permissions.view_patients,
    permissions.view_doctors,
    
    // Agendamentos - ver e gerenciar seus próprios
    permissions.view_appointments,
    permissions.edit_appointments,
    permissions.cancel_appointments,
    
    // Telemedicina
    permissions.view_telemedicine,
    permissions.start_telemedicine,
    
    // Prontuários e Documentos - criar e editar
    permissions.view_medical_records,
    permissions.create_medical_records,
    permissions.edit_medical_records,
    
    permissions.view_prescriptions,
    permissions.create_prescriptions,
    permissions.edit_prescriptions,
    
    permissions.view_exams,
    permissions.create_exams,
    permissions.edit_exams,
    
    permissions.view_attestados,
    permissions.create_attestados,
    
    // Estudos de Caso
    permissions.view_case_studies,
    permissions.create_case_studies,
    permissions.edit_case_studies,
    permissions.delete_case_studies,
    
    // Relatórios - apenas visualizar
    permissions.view_reports,
  ],
  
  secretaria: [
    // Dashboard e visão geral
    permissions.view_dashboard,
    permissions.view_notifications,
    
    // Pessoas - gerenciar completamente
    permissions.view_patients,
    permissions.create_patients,
    permissions.edit_patients,
    permissions.delete_patients,
    
    permissions.view_doctors,
    permissions.create_doctors,
    permissions.edit_doctors,
    permissions.delete_doctors,
    
    // Agendamentos - gerenciar completamente
    permissions.view_appointments,
    permissions.create_appointments,
    permissions.edit_appointments,
    permissions.delete_appointments,
    permissions.cancel_appointments,
    
    // Telemedicina - apenas visualizar
    permissions.view_telemedicine,
    
    // Documentos - apenas visualizar (não criar)
    permissions.view_medical_records,
    permissions.view_prescriptions,
    permissions.view_exams,
    permissions.view_attestados,
    
    // Salas - gerenciar
    permissions.view_rooms,
    permissions.manage_rooms,
    
    // Financeiro - visualizar
    permissions.view_financial,
    
    // Relatórios - visualizar e exportar
    permissions.view_reports,
    permissions.export_reports,
  ],
}

/**
 * Verifica se um role tem uma permissão específica
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  return rolePermissions[role]?.includes(permission) || false
}

/**
 * Verifica se um role tem qualquer uma das permissões fornecidas
 */
export function hasAnyPermission(role: UserRole, permissionList: string[]): boolean {
  return permissionList.some((perm) => hasPermission(role, perm))
}

/**
 * Verifica se um role tem todas as permissões fornecidas
 */
export function hasAllPermissions(role: UserRole, permissionList: string[]): boolean {
  return permissionList.every((perm) => hasPermission(role, perm))
}

