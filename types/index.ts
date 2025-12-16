// Tipos gerados do Supabase serão adicionados aqui
// Execute: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts

export type UserRole = 'admin' | 'medico' | 'enfermeiro' | 'recepcionista' | 'paciente' | 'desenvolvedor'

export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  user_id: string
  name: string
  cpf: string
  birth_date: string
  phone: string
  email: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  emergency_contact?: string
  emergency_phone?: string
  allergies?: string[]
  chronic_conditions?: string[]
  created_at: string
  updated_at: string
}

export interface Doctor {
  id: string
  user_id: string
  name: string
  crm: string
  specialty_id: string
  phone: string
  email: string
  whatsapp_phone?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Specialty {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  appointment_date: string
  appointment_time: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  created_at: string
  updated_at: string
}

