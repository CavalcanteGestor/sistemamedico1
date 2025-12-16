import { z } from 'zod'

export const anamnesisSchema = z.object({
  chief_complaint: z.string().min(1, 'Queixa principal é obrigatória'),
  history_of_present_illness: z.string().optional(),
  past_medical_history: z.string().optional(),
  family_history: z.string().optional(),
  social_history: z.string().optional(),
  occupational_history: z.string().optional(),
  lifestyle: z.string().optional(),
  medications: z.array(z.string()).optional().default([]),
  allergies: z.array(z.string()).optional().default([]),
  review_of_systems: z.record(z.any()).optional().default({}),
})

export type AnamnesisInput = z.infer<typeof anamnesisSchema>

