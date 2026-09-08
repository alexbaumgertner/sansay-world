import { z } from 'zod'

/** Shared by the client form and the server action — see contracts/enquiry-submit.md. */
export const enquirySchema = z.object({
  disciplineId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  preferredContactMethod: z.string().trim().min(1).max(200),
  desiredDate: z.string().optional(),
  jobDescription: z.string().trim().min(1).max(5000),
  honeypot: z.string().optional(),
})

export type EnquiryInput = z.infer<typeof enquirySchema>
