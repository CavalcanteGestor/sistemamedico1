import { z } from 'zod'

export const doctorSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  crm: z.string().min(4, 'CRM é obrigatório'),
  specialty_id: z.string().min(1, 'Especialidade é obrigatória'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
  whatsapp_phone: z.string().optional().refine(
    (val) => !val || val.includes('@s.whatsapp.net') || /^\d{10,15}$/.test(val.replace(/\D/g, '')),
    'Telefone WhatsApp inválido. Use o formato: 5599999999@s.whatsapp.net ou apenas números'
  ),
  active: z.boolean().default(true),
})

export type DoctorInput = z.infer<typeof doctorSchema>

