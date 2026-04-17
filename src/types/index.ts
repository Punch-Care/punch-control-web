export type UserRole = 'ADMIN' | 'MANAGER' | 'COMPANY' | 'CLIENT'

export type SetStatus = 'ACTIVE' | 'IN_REPAIR' | 'INACTIVE' | 'DISCARDED'

export type OccurrenceStatus = 'OPEN' | 'MONITORING' | 'CLOSED'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  company: { id: string; name: string } | null
}

export interface AuthResponse {
  token: string
  user: User
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
