export type UserRole = 'ADMIN' | 'MANAGER' | 'COMPANY' | 'CLIENT'

export type SetStatus = 'ACTIVE' | 'IN_REPAIR' | 'INACTIVE' | 'DISCARDED'

export type OccurrenceStatus = 'OPEN' | 'MONITORING' | 'CLOSED'

export type OccurrenceType = 'COMPRESSION' | 'DIMENSIONAL' | 'MAINTENANCE' | 'OTHER'

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

export interface PunchSet {
  id: string
  code: string
  name: string
  status: SetStatus
  usefulValue: number
  l30Limit: number
  l60Limit: number
  notes: string | null
  companyId: string
  createdAt: string
  updatedAt: string
  company: { id: string; name: string }
  _count: { punches: number; occurrences: number; dimensionRecords: number }
}

export interface Punch {
  id: string
  code: string
  type: 'upper' | 'lower' | 'matrix'
  position: number | null
  setId: string
  active: boolean
  createdAt: string
}

export interface LifecycleEvent {
  id: string
  setId: string
  fromStatus: SetStatus | null
  toStatus: SetStatus
  reason: string | null
  performedAt: string
}

export interface DimensionValue {
  id: string
  parameter: string
  value: number
  unit: string
  lowerLimit: number | null
  upperLimit: number | null
  isOk: boolean
}

export interface DimensionRecord {
  id: string
  setId: string
  measuredAt: string
  notes: string | null
  createdAt: string
  values: DimensionValue[]
}

export interface Machine {
  id: string
  name: string
  code: string | null
  companyId: string
  active: boolean
}

export interface Product {
  id: string
  name: string
  code: string | null
  companyId: string
  active: boolean
}

export interface Occurrence {
  id: string
  setId: string
  machineId: string | null
  productId: string | null
  type: OccurrenceType
  status: OccurrenceStatus
  description: string
  resolution: string | null
  openedAt: string
  closedAt: string | null
  set: { id: string; code: string; name: string }
  machine: { id: string; name: string; code: string | null } | null
  product: { id: string; name: string; code: string | null } | null
}

export interface DashboardStats {
  active: number
  inRepair: number
  inactive: number
  discarded: number
  recentlyDiscarded: number
  openOccurrences: number
  lowUsefulValue: number
  statusDistribution: { name: string; value: number; fill: string }[]
}
