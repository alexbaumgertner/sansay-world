import { z } from 'zod'

export const loginEmailSchema = z.object({
  email: z.string().trim().email().max(320),
})

export const loginCodeSchema = z.object({
  email: z.string().trim().email().max(320),
  code: z.string().regex(/^\d{6}$/),
})

export type LoginEmailInput = z.infer<typeof loginEmailSchema>
export type LoginCodeInput = z.infer<typeof loginCodeSchema>
