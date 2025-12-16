import { z } from 'zod'

const vitalSignsSchema = z.object({
  blood_pressure_systolic: z.number().min(0).max(300).optional(),
  blood_pressure_diastolic: z.number().min(0).max(200).optional(),
  heart_rate: z.number().min(0).max(250).optional(),
  respiratory_rate: z.number().min(0).max(60).optional(),
  temperature: z.number().min(30).max(45).optional(),
  oxygen_saturation: z.number().min(0).max(100).optional(),
  blood_glucose: z.number().min(0).max(1000).optional(),
  weight: z.number().min(0).max(500).optional(),
  height: z.number().min(0).max(250).optional(),
  bmi: z.number().min(0).max(100).optional(),
}).optional()

export const physicalExamSchema = z.object({
  general_appearance: z.string().optional(),
  vital_signs: vitalSignsSchema,
  cardiovascular: z.string().optional(),
  respiratory: z.string().optional(),
  abdominal: z.string().optional(),
  neurological: z.string().optional(),
  musculoskeletal: z.string().optional(),
  skin: z.string().optional(),
  head_and_neck: z.string().optional(),
  lymph_nodes: z.string().optional(),
  extremities: z.string().optional(),
  other: z.string().optional(),
  additional_notes: z.string().optional(),
})

export type PhysicalExamInput = z.infer<typeof physicalExamSchema>

