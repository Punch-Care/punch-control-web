import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import type { AuthResponse } from '@/types'

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout } = useAuthStore()

  async function login(email: string, password: string): Promise<void> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
    setAuth(data.token, data.user)
  }

  return { user, isAuthenticated, login, logout }
}
