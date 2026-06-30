import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  passwordExpired: boolean
  setAuth: (token: string, user: User, passwordExpired?: boolean) => void
  setPasswordExpired: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      passwordExpired: false,
      setAuth: (token, user, passwordExpired = false) =>
        set({ token, user, isAuthenticated: true, passwordExpired }),
      setPasswordExpired: (v) => set({ passwordExpired: v }),
      logout: () => set({ token: null, user: null, isAuthenticated: false, passwordExpired: false }),
    }),
    { name: 'punch-auth' },
  ),
)
