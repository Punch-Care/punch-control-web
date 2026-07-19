export type UserRole = 'ADMIN' | 'MANAGER' | 'COMPANY' | 'CLIENT'

export type SetStatus = 'ACTIVE' | 'IN_REPAIR' | 'INACTIVE' | 'DISCARDED'

export type JogoStatus =
  | 'LIMPO'
  | 'NAO_LIMPO'
  | 'EM_MANUTENCAO'
  | 'EM_POLIMENTO'
  | 'EXCLUIDO'
  | 'AGUARDANDO_DECISAO'

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
  passwordExpired?: boolean
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
  statusJogo: JogoStatus
  dataUltimaLimpeza: string | null
  dataUltimoPolimento: string | null
  fotoSuperiorUrl: string | null
  fotoFrontalUrl: string | null
  fotoLateralUrl: string | null
  desenhoPuncaoUrl: string | null
  desenhoPontaUrl: string | null
  desenhoMatrizUrl: string | null
  desenhoGravacaoUrl: string | null
  // Dados do solicitante (RFQ)
  solicitante: string | null
  funcaoSolicitante: string | null
  emailSolicitante: string | null
  telefoneSolicitante: string | null
  // Características do produto (RFQ) — JSON string array
  caracteristicas: string | null
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
  tipoCompressora: 'PADRAO' | 'MULT_LAYER' | null
  capacidadeMinCph: number | null
  capacidadeMaxCph: number | null
  qtdSaidas: number | null
  torreIntercambiavel: boolean | null
  forcaPreCompressaoKN: number | null
  forcaCompressaoKN: number | null
  diametroMaxComprimidoMm: number | null
  espessuraMaxComprimidoMm: number | null
  companyId: string
  active: boolean
}

export type ToolingComponentType = 'UPPER_PUNCH' | 'LOWER_PUNCH' | 'MATRIX' | 'SEGMENT'

export interface ToolingComponent {
  id: string
  setId: string
  type: ToolingComponentType
  // base
  qtdSolicitada: number | null
  numDesenho: string | null
  norma: string | null
  dimensoes: string | null
  // punções
  cargaRealKN: number | null
  qtdPontas: number | null
  tipoFixacao: string | null
  rebaixoRetentorOleo: boolean | null
  formatoComprimido: string | null
  profundidadeCavMm: number | null
  raioR1: number | null
  raioR2: number | null
  raioR3: number | null
  raioR4: number | null
  raioRa: number | null
  espessuraBorda: number | null
  descricaoFormatoEspecial: string | null
  rebaixoVedacaoTipo: string | null
  contemChaveta: boolean | null
  chavetaAnguloGraus: number | null
  chavetaAlturaMm: number | null
  chavetaEspessuraMm: number | null
  chavetaComprimentoMm: number | null
  tipoVinco: string | null
  configuracaoVinco: string | null
  gravacaoPonta: string | null
  opcaoAco: string | null
  opcaoRevestimento: string | null
  opcaoTratamento: string | null
  // matrizes
  conicoOuParalelo: string | null
}

// ── Ciclo de Vida expandido ────────────────────────────────────────────────────

export type ComponentInventoryType = 'P_SUPERIOR' | 'P_INFERIOR' | 'MATRIZ_1' | 'MATRIZ_2'

export interface LifecycleConfig {
  id: string
  setId: string
  fatorDepreciacao: number
  pesoMedioPadrao: number | null
}

export interface ComponentInventory {
  id: string
  setId: string
  tipo: ComponentInventoryType
  qtdAdquirida: number
  qtdUtilizada: number
  pontoEncomenda: number | null
}

export interface LifecycleProductionRecord {
  id: string
  setId: string
  batchId: string | null
  produto: string
  data: string
  maquina: string | null
  numLote: string
  qtdKg: number
  percUtilizacao: number
  percAcumulado: number
  createdAt: string
}

export interface LifecycleMaintenanceRecord {
  id: string
  setId: string
  data: string
  componente: ComponentInventoryType
  quantidade: number
  notas: string | null
  createdAt: string
}

export interface LifecycleData {
  config: LifecycleConfig | null
  inventory: ComponentInventory[]
  production: LifecycleProductionRecord[]
  maintenance: LifecycleMaintenanceRecord[]
  percAcumulado: number
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
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
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

// ── Produção (CEP) ──────────────────────────────────────────────────────────

export type BatchOccurrenceType = 'CAPPING' | 'STICKING' | 'TRAVAMENTO' | 'QUEBRA' | 'OXIDACAO' | 'OUTROS'
export type BatchStatus = 'DRAFT' | 'COMPLETED'

export interface ProductionConfigParam {
  id: string
  configId: string
  ordem: number
  nome: string
  unidade: string | null
  minimo: number | null
  maximo: number | null
  sugerido: number | null
}

export interface ProductionConfig {
  id: string
  companyId: string
  productId: string
  machineId: string
  product: { id: string; name: string; code: string | null }
  machine: { id: string; name: string; code: string | null }
  params: ProductionConfigParam[]
  _count?: { batches: number }
}

export interface BatchFixedParam {
  id: string
  batchId: string
  ordem: number
  nome: string
  unidade: string | null
  minimo: number | null
  maximo: number | null
  sugerido: number | null
  valorReal: number | null
  isOk: boolean | null
}

export interface BatchHourlyMeasurement {
  id: string
  batchId: string
  ordem: number
  horario: string
  roloCmpDir: number | null
  roloCmpEsq: number | null
  rampaDosEsq: number | null
  rampaDosDir: number | null
  pressaoCFCL1: number | null
  pressaoCFCL2: number | null
  coefVarL1: number | null
  coefVarL2: number | null
  responsavel: string | null
  observacoes: string | null
}

export interface BatchOccurrence {
  id: string
  batchId: string
  type: BatchOccurrenceType
  notas: string | null
}

export interface ProductionBatch {
  id: string
  companyId: string
  configId: string | null
  productId: string
  machineId: string
  punchSetId: string
  loteNumero: string
  dataProducao: string
  horaInicio: string
  duracaoEstimadaHoras: number | null
  kgProduzidos: number | null
  observacoesOperador: string | null
  observacoesTecnico: string | null
  separadoPor: string | null
  status: BatchStatus
  createdAt: string
  product: { id: string; name: string; code: string | null }
  machine: { id: string; name: string; code: string | null; fabricante?: string | null; modelo?: string | null }
  punchSet: { id: string; code: string; name: string }
  config?: ProductionConfig | null
  fixedParams?: BatchFixedParam[]
  hourlyMeasurements?: BatchHourlyMeasurement[]
  batchOccurrences?: BatchOccurrence[]
  _count?: { hourlyMeasurements: number; batchOccurrences: number }
}

export interface AuditLog {
  id: string
  userId: string | null
  userEmail: string | null
  userRole: string | null
  method: string
  path: string
  action: string
  statusCode: number
  ip: string | null
  createdAt: string
}

export interface AuditLogResponse {
  total: number
  page: number
  pageSize: number
  rows: AuditLog[]
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
