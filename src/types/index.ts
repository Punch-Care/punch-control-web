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
  fabricante: string | null
  modelo: string | null
  numeroSerie: string | null
  anoFabricacao: number | null
  qtdEstacao: number | null
  norma: string | null
  anguloChaveta: string | null
  companyId: string
  active: boolean
}

export type ToolingComponentType = 'UPPER_PUNCH' | 'LOWER_PUNCH' | 'MATRIX' | 'SEGMENT'

export interface ToolingComponent {
  id: string
  setId: string
  type: ToolingComponentType
  qtdSolicitada: number | null
  numDesenho: string | null
  norma: string | null
  dimensoes: string | null
}

export interface Product {
  id: string
  name: string
  code: string | null
  companyId: string
  active: boolean
  company?: { id: string; name: string }
  _count?: { punchSetProducts: number; occurrences: number }
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

export interface Company {
  id: string
  name: string
  cnpj: string | null
  razaoSocial: string | null
  inscricaoEstadual: string | null
  logradouro: string | null
  complemento: string | null
  cidade: string | null
  estado: string | null
  telefone: string | null
  active: boolean
  createdAt: string
  _count: { users: number }
}

export interface CompanyOverview {
  id: string
  name: string
  cnpj: string | null
  cidade: string | null
  estado: string | null
  activeSets: number
  openOccurrences: number
  _count: { punchSets: number; machines: number; users: number }
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
