import { z } from 'zod'

export const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Paciente é obrigatório'),
  doctor_id: z.string().min(1, 'Médico é obrigatório'),
  appointment_date: z.string().min(1, 'Data é obrigatória'),
  appointment_time: z.string().min(1, 'Horário é obrigatório'),
  consultation_type: z.enum(['presencial', 'telemedicina', 'hibrida']).optional().default('presencial'),
  room_id: z.string().optional().nullable(),
  notes: z.string().optional(),
})

export type AppointmentInput = z.infer<typeof appointmentSchema>

