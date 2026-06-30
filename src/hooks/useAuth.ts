import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import type { AuthResponse } from '@/types'
import { z } from 'zod'

const authResponseSchema = z.object({
  token: z.string().min(1),
  passwordExpired: z.boolean().optional(),
  user: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['ADMIN', 'MANAGER', 'COMPANY', 'CLIENT']),
    active: z.boolean(),
    company: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
      })
      .nullable(),
  }),
})

export function useAuth() {
  const { user, isAuthenticated, passwordExpired, setAuth, setPasswordExpired, logout } = useAuthStore()

  async function login(email: string, password: string): Promise<void> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password })

    const parsed = authResponseSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(
        'Resposta de login inválida. Verifique se VITE_API_URL aponta para a API.',
      )
    }

    setAuth(parsed.data.token, parsed.data.user, parsed.data.passwordExpired ?? false)
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword })
    setPasswordExpired(false)
  }

  return { user, isAuthenticated, passwordExpired, login, changePassword, logout }
}
