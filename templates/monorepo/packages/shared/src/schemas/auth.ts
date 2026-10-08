import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email or login"),
  password: z.string().min(6, "At least 6 characters"),
})
export type LoginInput = z.infer<typeof loginSchema>

export const sessionUserSchema = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  name: z.string().nullable(),
})
export type SessionUser = z.infer<typeof sessionUserSchema>
