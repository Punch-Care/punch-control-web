import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Loader2, Printer, Download,
  CheckCircle2, ClipboardList, Settings2, Clock, AlertTriangle,
  MessageSquare, ChevronRight, Factory, XCircle, Activity,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProductsQuery, useMachinesQuery, usePunchSetsQuery } from '@/hooks/queries'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { useAuth } from '@/hooks/useAuth'
import type {
  ProductionBatch, ProductionConfig,
  BatchFixedParam, BatchHourlyMeasurement, BatchOccurrence,
  BatchOccurrenceType,
} from '@/types'
import { format } from 'date-fns'

const BRAND: [number, number, number] = [240, 89, 34]
const OCCURRENCE_TYPES: BatchOccurrenceType[] = ['CAPPING', 'STICKING', 'TRAVAMENTO', 'QUEBRA', 'OXIDACAO', 'OUTROS']

// ── PDF ───────────────────────────────────────────────────────────────────────

function generateBlankPdf(form: BatchData, config: ProductionConfig | null, numHoras: number) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const W = doc.internal.pageSize.width

  doc.setFillColor(...BRAND)
  doc.rect(0, 0, W, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTROLE DE PARÂMETROS E PROCESSO', 14, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Punch Control · Punch Care · Formulário para preenchimento manual', 14, 17)

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const row1 = `Lote: ${form.loteNumero || '_______________'}     Data: ${form.dataProducao || '___/___/______'}     Hora início: ${form.horaInicio || '__:__'}`
  doc.text(row1, 14, 28)

  const params = config?.params ?? []
  if (params.length > 0) {
    autoTable(doc, {
      startY: 33,
      head: [['#', 'Parâmetro', 'Unidade', 'Mínimo', 'Máximo', 'Sugerido', 'Valor Real (preencher)']],
      body: params.map((p, i) => [i + 1, p.nome, p.unidade ?? '—', p.minimo ?? '—', p.maximo ?? '—', p.sugerido ?? '—', '']),
      headStyles: { fillColor: BRAND, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: { 6: { minCellWidth: 40 } },
      margin: { left: 14, right: 14 },
    })
  }

  const afterFixed = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 33

  const hourRows = Array.from({ length: numHoras }, (_, i) => [
    `${String(i + 1).padStart(2, '0')}h`, '', '', '', '', '', '', '', '', '', '',
  ])

  autoTable(doc, {
    startY: afterFixed + 8,
    head: [['Hora', 'Rolo Cmp. Dir. (mm)', 'Rolo Cmp. Esq. (mm)', 'Rampa Dos. Esq. (mm)', 'Rampa Dos. Dir. (mm)', 'CFC L1', 'CFC L2', 'CV L1 (%)', 'CV L2 (%)', 'Responsável', 'Obs.']],
    body: hourRows,
    headStyles: { fillColor: [55, 105, 170], fontSize: 7, fontStyle: 'bold', textColor: 255 },
    bodyStyles: { fontSize: 7, minCellHeight: 8 },
    margin: { left: 14, right: 14 },
  })

  const afterHourly = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? afterFixed + 8

  doc.setDrawColor(180, 180, 180)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Ocorrências:', 14, afterHourly + 9)
  doc.setFont('helvetica', 'normal')
  doc.text('□ Capping   □ Sticking   □ Travamento   □ Quebra   □ Oxidação   □ Outros: ______________', 45, afterHourly + 9)
  doc.line(14, afterHourly + 13, W - 14, afterHourly + 13)
  doc.text(`KG Produzidos: ___________     Separado por: _________________________________`, 14, afterHourly + 19)
  doc.line(14, afterHourly + 23, W - 14, afterHourly + 23)
  doc.text('Obs. Operador:', 14, afterHourly + 29)
  doc.line(50, afterHourly + 29, W - 14, afterHourly + 29)
  doc.text('Obs. Técnico:', 14, afterHourly + 36)
  doc.line(47, afterHourly + 36, W - 14, afterHourly + 36)

  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} · Punch Control`, 14, doc.internal.pageSize.height - 6)

  doc.save(`formulario_${form.loteNumero || 'em_branco'}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}

function generateCompletedPdf(batch: ProductionBatch) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const W = doc.internal.pageSize.width

  doc.setFillColor(...BRAND)
  doc.rect(0, 0, W, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(`REGISTRO DE LOTE — ${batch.loteNumero}`, 14, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Punch Control · Punch Care · Documento gerado automaticamente', 14, 17)

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  const info = [
    `Produto: ${batch.product.name}`,
    `Máquina: ${batch.machine.name}`,
    `Jogo: ${batch.punchSet.code} — ${batch.punchSet.name}`,
    `Data: ${format(new Date(batch.dataProducao), 'dd/MM/yyyy')}  ${batch.horaInicio}`,
    batch.kgProduzidos ? `KG: ${batch.kgProduzidos}` : '',
  ].filter(Boolean).join('     ')
  doc.text(info, 14, 28)

  const fp = batch.fixedParams ?? []
  if (fp.length > 0) {
    autoTable(doc, {
      startY: 33,
      head: [['Parâmetro', 'Un.', 'Mín.', 'Máx.', 'Sugerido', 'Real', 'Status']],
      body: fp.map(p => [
        p.nome, p.unidade ?? '—', p.minimo ?? '—', p.maximo ?? '—',
        p.sugerido ?? '—', p.valorReal ?? '—',
        p.isOk === null ? '—' : p.isOk ? 'OK' : 'DESVIO',
      ]),
      headStyles: { fillColor: BRAND, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 6 && data.cell.raw === 'DESVIO') {
          data.cell.styles.textColor = [200, 0, 0]
          data.cell.styles.fontStyle = 'bold'
        }
      },
      margin: { left: 14, right: 14 },
    })
  }

  const afterFixed = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 33
  const hourly = batch.hourlyMeasurements ?? []

  if (hourly.length > 0) {
    autoTable(doc, {
      startY: afterFixed + 8,
      head: [['Hora', 'Rolo Dir.', 'Rolo Esq.', 'Rampa Esq.', 'Rampa Dir.', 'CFC L1', 'CFC L2', 'CV L1', 'CV L2', 'Responsável', 'Obs.']],
      body: hourly.map(m => [
        m.horario,
        m.roloCmpDir ?? '—', m.roloCmpEsq ?? '—',
        m.rampaDosEsq ?? '—', m.rampaDosDir ?? '—',
        m.pressaoCFCL1 ?? '—', m.pressaoCFCL2 ?? '—',
        m.coefVarL1 ?? '—', m.coefVarL2 ?? '—',
        m.responsavel ?? '—', m.observacoes ?? '',
      ]),
      headStyles: { fillColor: [55, 105, 170], fontSize: 7, fontStyle: 'bold', textColor: 255 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    })
  }

  const afterHourly = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? afterFixed + 8
  const occs = (batch.batchOccurrences ?? []).map(o => o.type).join(', ')

  doc.setFontSize(8)
  doc.text(`Ocorrências: ${occs || 'Nenhuma'}`, 14, afterHourly + 8)
  doc.text(`KG Produzidos: ${batch.kgProduzidos ?? '—'}    Separado por: ${batch.separadoPor ?? '—'}`, 14, afterHourly + 15)
  if (batch.observacoesOperador) doc.text(`Obs. Operador: ${batch.observacoesOperador}`, 14, afterHourly + 22)
  if (batch.observacoesTecnico) doc.text(`Obs. Técnico: ${batch.observacoesTecnico}`, 14, afterHourly + 29)

  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} · Punch Control`, 14, doc.internal.pageSize.height - 6)

  doc.save(`registro_${batch.loteNumero}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface BatchData {
  configId: string
  productId: string
  machineId: string
  punchSetId: string
  loteNumero: string
  dataProducao: string
  horaInicio: string
  duracaoEstimadaHoras: string
  kgProduzidos: string
  observacoesOperador: string
  observacoesTecnico: string
  separadoPor: string
  status: 'DRAFT' | 'COMPLETED'
}

interface LocalFixed extends Omit<BatchFixedParam, 'id' | 'batchId'> {}
interface LocalMeasurement extends Omit<BatchHourlyMeasurement, 'id' | 'batchId'> {}
interface LocalOccurrence extends Omit<BatchOccurrence, 'id' | 'batchId'> {}

// ── Componente de seção ───────────────────────────────────────────────────────

function Section({ step, icon: Icon, title, subtitle, children, alert }: {
  step: number
  icon: React.ElementType
  title: string
  subtitle?: string
  children: React.ReactNode
  alert?: string
}) {
  return (
    <div className="flex gap-4">
      {/* Step indicator */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="w-0.5 flex-1 bg-border mt-2 min-h-4" />
      </div>
      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etapa {step}</span>
          {alert && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />{alert}
            </Badge>
          )}
        </div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5 mb-4">{subtitle}</p>}
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export function BatchFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()
  const { user } = useAuth()
  const { companyId: adminCompanyId } = useAdminCompany()
  const [searchParams] = useSearchParams()
  const p = t.production
  const isEdit = !!id
  const canEdit = user?.role !== 'CLIENT'

  const [form, setForm] = useState<BatchData>({
    configId: '', productId: '', machineId: '',
    punchSetId: searchParams.get('setId') ?? '',
    loteNumero: '', dataProducao: format(new Date(), 'yyyy-MM-dd'),
    horaInicio: format(new Date(), 'HH:mm'),
    duracaoEstimadaHoras: '8', kgProduzidos: '',
    observacoesOperador: '', observacoesTecnico: '',
    separadoPor: '', status: 'DRAFT',
  })
  const [showLifecyclePrompt, setShowLifecyclePrompt] = useState(false)
  const [completedSetId, setCompletedSetId] = useState<string | null>(null)
  const [completedSetCode, setCompletedSetCode] = useState<string | null>(null)
  const [fixedParams, setFixedParams] = useState<LocalFixed[]>([])
  const [measurements, setMeasurements] = useState<LocalMeasurement[]>([])
  const [occurrences, setOccurrences] = useState<LocalOccurrence[]>([])

  // Queries — shared hooks guarantee cache hit when user navigates from other pages
  const { data: products = [] } = useProductsQuery(adminCompanyId)
  const { data: machines = [] } = useMachinesQuery(adminCompanyId)
  const { data: sets = [] } = usePunchSetsQuery(adminCompanyId)

  const { data: config } = useQuery<ProductionConfig | null>({
    queryKey: ['production-config-by-pm', form.productId, form.machineId],
    queryFn: async () => {
      if (!form.productId || !form.machineId) return null
      const all = await api.get('/production-configs', { params: { companyId: adminCompanyId } }).then(r => r.data as ProductionConfig[])
      return all.find(c => c.productId === form.productId && c.machineId === form.machineId) ?? null
    },
    enabled: !!form.productId && !!form.machineId,
  })

  const { data: existingBatch } = useQuery<ProductionBatch>({
    queryKey: ['production-batch', id],
    queryFn: () => api.get(`/production-batches/${id}`).then(r => r.data),
    enabled: isEdit,
  })

  // Carregar lote existente
  useEffect(() => {
    if (!existingBatch) return
    setForm({
      configId: existingBatch.configId ?? '',
      productId: existingBatch.productId,
      machineId: existingBatch.machineId,
      punchSetId: existingBatch.punchSetId,
      loteNumero: existingBatch.loteNumero,
      dataProducao: format(new Date(existingBatch.dataProducao), 'yyyy-MM-dd'),
      horaInicio: existingBatch.horaInicio,
      duracaoEstimadaHoras: existingBatch.duracaoEstimadaHoras?.toString() ?? '8',
      kgProduzidos: existingBatch.kgProduzidos?.toString() ?? '',
      observacoesOperador: existingBatch.observacoesOperador ?? '',
      observacoesTecnico: existingBatch.observacoesTecnico ?? '',
      separadoPor: existingBatch.separadoPor ?? '',
      status: existingBatch.status,
    })
    setFixedParams(existingBatch.fixedParams ?? [])
    setMeasurements(existingBatch.hourlyMeasurements ?? [])
    setOccurrences((existingBatch.batchOccurrences ?? []).map(o => ({ type: o.type, notas: o.notas })))
  }, [existingBatch])

  // Auto-carregar parâmetros da configuração
  useEffect(() => {
    if (!config || fixedParams.length > 0) return
    setFixedParams(config.params.map(pr => ({
      ordem: pr.ordem, nome: pr.nome, unidade: pr.unidade,
      minimo: pr.minimo, maximo: pr.maximo, sugerido: pr.sugerido,
      valorReal: null, isOk: null,
    })))
    setForm(f => ({ ...f, configId: config.id }))
  }, [config])

  const setField = (field: keyof BatchData, value: string) => setForm(f => ({ ...f, [field]: value }))

  const updateFixedParam = (idx: number, rawValue: string) => {
    setFixedParams(prev => prev.map((fp, i) => {
      if (i !== idx) return fp
      const n = rawValue === '' ? null : parseFloat(rawValue.replace(',', '.'))
      const valorReal = n === null || isNaN(n) ? null : n
      const isOk = valorReal === null ? null
        : (fp.minimo === null || valorReal >= fp.minimo) && (fp.maximo === null || valorReal <= fp.maximo)
      return { ...fp, valorReal, isOk }
    }))
  }

  const addMeasurement = () => {
    const lastH = measurements.length > 0
      ? (parseInt(measurements[measurements.length - 1].horario.split(':')[0]) + 1) % 24
      : parseInt(form.horaInicio.split(':')[0] || '0')
    setMeasurements(prev => [...prev, {
      ordem: prev.length + 1,
      horario: `${String(lastH).padStart(2, '0')}:00`,
      roloCmpDir: null, roloCmpEsq: null,
      rampaDosEsq: null, rampaDosDir: null,
      pressaoCFCL1: null, pressaoCFCL2: null,
      coefVarL1: null, coefVarL2: null,
      responsavel: null, observacoes: null,
    }])
  }

  const updateMeasurement = (idx: number, field: keyof LocalMeasurement, raw: string) => {
    setMeasurements(prev => prev.map((m, i) => {
      if (i !== idx) return m
      if (field === 'horario' || field === 'responsavel' || field === 'observacoes') return { ...m, [field]: raw || null }
      const n = parseFloat(raw.replace(',', '.'))
      return { ...m, [field]: isNaN(n) ? null : n }
    }))
  }

  const removeMeasurement = (idx: number) => {
    setMeasurements(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, ordem: i + 1 })))
  }

  const toggleOccurrence = (type: BatchOccurrenceType) => {
    setOccurrences(prev =>
      prev.some(o => o.type === type) ? prev.filter(o => o.type !== type) : [...prev, { type, notas: null }]
    )
  }

  const buildPayload = (status: 'DRAFT' | 'COMPLETED') => ({
    configId: form.configId || null,
    productId: form.productId,
    machineId: form.machineId,
    punchSetId: form.punchSetId,
    loteNumero: form.loteNumero,
    dataProducao: form.dataProducao,
    horaInicio: form.horaInicio,
    duracaoEstimadaHoras: form.duracaoEstimadaHoras ? parseInt(form.duracaoEstimadaHoras) : null,
    kgProduzidos: form.kgProduzidos ? parseFloat(form.kgProduzidos) : null,
    observacoesOperador: form.observacoesOperador || null,
    observacoesTecnico: form.observacoesTecnico || null,
    separadoPor: form.separadoPor || null,
    status,
    fixedParams,
    hourlyMeasurements: measurements,
    batchOccurrences: occurrences,
  })

  const saveMutation = useMutation({
    mutationFn: (status: 'DRAFT' | 'COMPLETED') =>
      isEdit ? api.put(`/production-batches/${id}`, buildPayload(status)) : api.post('/production-batches', buildPayload(status)),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['production-batches'] })
      toast.success(isEdit ? p.updated : p.created)
      if (status === 'COMPLETED' && form.punchSetId && form.kgProduzidos) {
        const set = sets.find(s => s.id === form.punchSetId)
        setCompletedSetId(form.punchSetId)
        setCompletedSetCode(set ? `${set.code} — ${set.name}` : form.punchSetId)
        setShowLifecyclePrompt(true)
      } else if (status === 'COMPLETED') {
        navigate('/production')
      }
    },
    onError: () => toast.error(isEdit ? p.updateError : p.createError),
  })

  const numHoras = parseInt(form.duracaoEstimadaHoras) || 8
  const hasAlerts = fixedParams.some(fp => fp.isOk === false)
  const canSubmit = !!form.productId && !!form.machineId && !!form.punchSetId && !!form.loteNumero
  const selectedProduct = products.find(pr => pr.id === form.productId)
  const selectedMachine = machines.find(m => m.id === form.machineId)
  const selectedSet = sets.find(s => s.id === form.punchSetId)

  return (
    <div className="min-h-screen bg-muted/30">

      {/* Prompt de atualização do ciclo de vida */}
      <Dialog open={showLifecyclePrompt} onOpenChange={open => { if (!open) { setShowLifecyclePrompt(false); navigate('/production') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Lote concluído!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Deseja registrar os <strong>{form.kgProduzidos} kg</strong> produzidos no ciclo de vida do jogo{' '}
              <strong className="text-foreground font-mono">{completedSetCode}</strong>?
            </p>
            <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
              Isso mantém o controle de depreciação do ferramental atualizado e evita que o ciclo de vida fique desatualizado.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  setShowLifecyclePrompt(false)
                  navigate(`/lifecycle?setId=${completedSetId}`)
                }}
              >
                <Activity className="h-4 w-4" />
                Sim, atualizar ciclo de vida
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setShowLifecyclePrompt(false); navigate('/production') }}
              >
                Não, obrigado
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => navigate('/production')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <Breadcrumb items={[
                { label: 'Produção', href: '/production' },
                { label: isEdit && form.loteNumero ? `Lote ${form.loteNumero}` : 'Novo Lote' },
              ]} />
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm truncate">
                  {isEdit ? 'Editar Lote' : 'Novo Lote de Produção'}
                </h1>
                {form.loteNumero && (
                  <span className="font-mono text-primary font-bold text-sm">{form.loteNumero}</span>
                )}
                <Badge variant={form.status === 'COMPLETED' ? 'success' : 'secondary'} className="text-xs">
                  {form.status === 'COMPLETED' ? p.statusCompleted : p.statusDraft}
                </Badge>
              </div>
              {selectedProduct && selectedMachine && (
                <p className="text-xs text-muted-foreground truncate">
                  {selectedProduct.name} · {selectedMachine.name}
                  {selectedSet && <> · <span className="font-mono">{selectedSet.code}</span></>}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => generateBlankPdf(form, config ?? null, numHoras)}>
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Imprimir</span>
            </Button>
            {isEdit && existingBatch && (
              <Button variant="outline" size="sm" onClick={() => generateCompletedPdf(existingBatch)}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">PDF</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-8">

        {/* ── Etapa 1: Identificação ─────────────────────────────────────── */}
        <Section
          step={1}
          icon={Factory}
          title="Identificação do Lote"
          subtitle="Selecione o produto, a máquina e o jogo de punções que serão utilizados nesta produção."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background rounded-xl border p-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Produto *</Label>
              <Select value={form.productId || '__none__'} onValueChange={v => setField('productId', v === '__none__' ? '' : v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>Selecione o produto</SelectItem>
                  {products.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.name}{pr.code ? ` · ${pr.code}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Máquina *</Label>
              <Select value={form.machineId || '__none__'} onValueChange={v => setField('machineId', v === '__none__' ? '' : v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Selecione a máquina" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>Selecione a máquina</SelectItem>
                  {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}{m.modelo ? ` · ${m.modelo}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium">Jogo de Punções *</Label>
              <Select value={form.punchSetId || '__none__'} onValueChange={v => setField('punchSetId', v === '__none__' ? '' : v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Selecione o jogo de punções" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>Selecione o jogo</SelectItem>
                  {sets.map(s => <SelectItem key={s.id} value={s.id}><span className="font-mono">{s.code}</span> — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nº do Lote *</Label>
              <Input placeholder="ex: Z0032" value={form.loteNumero} onChange={e => setField('loteNumero', e.target.value)} disabled={!canEdit} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data de Produção *</Label>
              <Input type="date" value={form.dataProducao} onChange={e => setField('dataProducao', e.target.value)} disabled={!canEdit} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Hora de Início</Label>
              <Input type="time" value={form.horaInicio} onChange={e => setField('horaInicio', e.target.value)} disabled={!canEdit} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Duração estimada (horas)</Label>
              <div className="relative">
                <Input type="number" min="1" max="48" placeholder="ex: 8" value={form.duracaoEstimadaHoras} onChange={e => setField('duracaoEstimadaHoras', e.target.value)} disabled={!canEdit} />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">h</span>
              </div>
              <p className="text-xs text-muted-foreground">Define quantas linhas o formulário impresso terá</p>
            </div>

            {/* Config badge */}
            {form.productId && form.machineId && (
              <div className="sm:col-span-2">
                {config ? (
                  config.params.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Configuração encontrada — <strong>{config.params.length} parâmetros fixos</strong> carregados automaticamente</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Esta máquina não possui parâmetros CEP — o lote será registrado sem validação de limites</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Nenhuma configuração para este Produto + Máquina. Você pode <strong>continuar sem parâmetros</strong> ou criar uma configuração na aba <strong>Configurações de Processo</strong>.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* ── Etapa 2: Parâmetros Fixos ──────────────────────────────────── */}
        <Section
          step={2}
          icon={Settings2}
          title="Parâmetros Fixos do Setup"
          subtitle="Registre os valores reais de cada parâmetro medidos no início da produção. Valores fora do range serão sinalizados automaticamente."
          alert={hasAlerts ? `${fixedParams.filter(fp => fp.isOk === false).length} desvio(s)` : undefined}
        >
          {fixedParams.length === 0 ? (
            <div className="bg-background border rounded-xl p-6 text-center space-y-2">
              <Settings2 className="h-8 w-8 text-muted-foreground mx-auto" />
              {!form.productId || !form.machineId ? (
                <p className="text-sm text-muted-foreground">Selecione o Produto e a Máquina na Etapa 1</p>
              ) : config && config.params.length === 0 ? (
                <>
                  <p className="text-sm font-medium">Máquina sem parâmetros CEP</p>
                  <p className="text-xs text-muted-foreground">Esta combinação Produto + Máquina não possui parâmetros fixos configurados.<br/>O lote será registrado normalmente — apenas sem validação de limites.</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma configuração encontrada para este Produto + Máquina</p>
              )}
            </div>
          ) : (
            <div className="bg-background border rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="text-left px-4 py-2.5 font-medium text-xs">Parâmetro</th>
                    <th className="text-center px-2 py-2.5 font-medium text-xs w-16">Un.</th>
                    <th className="text-center px-2 py-2.5 font-medium text-xs w-20">Mín.</th>
                    <th className="text-center px-2 py-2.5 font-medium text-xs w-20">Máx.</th>
                    <th className="text-center px-2 py-2.5 font-medium text-xs w-20">Sugerido</th>
                    <th className="text-center px-2 py-2.5 font-medium text-xs w-32">Valor Real</th>
                    <th className="text-center px-2 py-2.5 font-medium text-xs w-16">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fixedParams.map((fp, idx) => (
                    <tr key={idx} className={`border-b last:border-0 ${fp.isOk === false ? 'bg-red-50' : idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-4 py-2">{fp.nome}</td>
                      <td className="px-2 py-2 text-center text-xs text-muted-foreground">{fp.unidade ?? '—'}</td>
                      <td className="px-2 py-2 text-center text-xs tabular-nums">{fp.minimo ?? '—'}</td>
                      <td className="px-2 py-2 text-center text-xs tabular-nums">{fp.maximo ?? '—'}</td>
                      <td className="px-2 py-2 text-center text-xs tabular-nums text-muted-foreground">{fp.sugerido ?? '—'}</td>
                      <td className="px-2 py-2">
                        <Input
                          className="h-7 text-sm text-center tabular-nums"
                          value={fp.valorReal?.toString() ?? ''}
                          onChange={e => updateFixedParam(idx, e.target.value)}
                          disabled={!canEdit}
                          placeholder="—"
                        />
                      </td>
                      <td className="px-2 py-2 text-center text-base">
                        {fp.isOk === null
                        ? <span className="text-muted-foreground text-xs">—</span>
                        : fp.isOk
                          ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          : <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                      }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ── Etapa 3: Medições Horárias ─────────────────────────────────── */}
        <Section
          step={3}
          icon={Clock}
          title="Medições Horárias"
          subtitle="Digite os valores coletados a cada hora de produção conforme preenchido no formulário impresso."
        >
          {measurements.length === 0 ? (
            <div className="bg-background border rounded-xl p-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma medição registrada</p>
              {canEdit && (
                <Button size="sm" className="mt-3" onClick={addMeasurement}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar primeira medição
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-background border rounded-xl overflow-hidden space-y-0">
              {/* Mobile: cards empilhados */}
              <div className="md:hidden divide-y">
                {measurements.map((m, idx) => (
                  <div key={idx} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medição {idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input className="h-7 text-xs text-center w-20" value={m.horario} onChange={e => updateMeasurement(idx, 'horario', e.target.value)} disabled={!canEdit} placeholder="HH:mm" />
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeMeasurement(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ['Rolo Cmp. Dir.', 'roloCmpDir'],
                        ['Rolo Cmp. Esq.', 'roloCmpEsq'],
                        ['Rampa Dos. Esq.', 'rampaDosEsq'],
                        ['Rampa Dos. Dir.', 'rampaDosDir'],
                        ['CFC L1', 'pressaoCFCL1'],
                        ['CFC L2', 'pressaoCFCL2'],
                        ['CV L1 (%)', 'coefVarL1'],
                        ['CV L2 (%)', 'coefVarL2'],
                      ] as [string, keyof LocalMeasurement][]).map(([label, field]) => (
                        <div key={field} className="space-y-1">
                          <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                          <Input className="h-7 text-xs" value={m[field]?.toString() ?? ''} onChange={e => updateMeasurement(idx, field, e.target.value)} disabled={!canEdit} placeholder="—" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-medium">Responsável</p>
                        <Input className="h-7 text-xs" value={m.responsavel ?? ''} onChange={e => updateMeasurement(idx, 'responsavel', e.target.value)} disabled={!canEdit} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-medium">Observações</p>
                        <Input className="h-7 text-xs" value={m.observacoes ?? ''} onChange={e => updateMeasurement(idx, 'observacoes', e.target.value)} disabled={!canEdit} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela compacta */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs min-w-[820px]">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      <th className="text-center px-2 py-2 font-medium w-14">Hora</th>
                      <th className="text-center px-1 py-2 font-medium">R.Dir.</th>
                      <th className="text-center px-1 py-2 font-medium">R.Esq.</th>
                      <th className="text-center px-1 py-2 font-medium">Rp.Esq.</th>
                      <th className="text-center px-1 py-2 font-medium">Rp.Dir.</th>
                      <th className="text-center px-1 py-2 font-medium">CFC L1</th>
                      <th className="text-center px-1 py-2 font-medium">CFC L2</th>
                      <th className="text-center px-1 py-2 font-medium">CV1%</th>
                      <th className="text-center px-1 py-2 font-medium">CV2%</th>
                      <th className="text-center px-1 py-2 font-medium">Resp.</th>
                      <th className="text-center px-1 py-2 font-medium">Obs.</th>
                      {canEdit && <th className="w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m, idx) => (
                      <tr key={idx} className={`border-b last:border-0 ${idx % 2 ? 'bg-muted/20' : ''}`}>
                        <td className="px-1 py-1">
                          <Input className="h-7 text-xs text-center w-14" value={m.horario} onChange={e => updateMeasurement(idx, 'horario', e.target.value)} disabled={!canEdit} />
                        </td>
                        {(['roloCmpDir', 'roloCmpEsq', 'rampaDosEsq', 'rampaDosDir', 'pressaoCFCL1', 'pressaoCFCL2', 'coefVarL1', 'coefVarL2'] as const).map(field => (
                          <td key={field} className="px-1 py-1">
                            <Input className="h-7 text-xs text-center w-16" value={m[field]?.toString() ?? ''} onChange={e => updateMeasurement(idx, field, e.target.value)} disabled={!canEdit} placeholder="—" />
                          </td>
                        ))}
                        <td className="px-1 py-1"><Input className="h-7 text-xs w-20" value={m.responsavel ?? ''} onChange={e => updateMeasurement(idx, 'responsavel', e.target.value)} disabled={!canEdit} /></td>
                        <td className="px-1 py-1"><Input className="h-7 text-xs w-24" value={m.observacoes ?? ''} onChange={e => updateMeasurement(idx, 'observacoes', e.target.value)} disabled={!canEdit} /></td>
                        {canEdit && (
                          <td className="px-1 py-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeMeasurement(idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {canEdit && (
                <div className="p-3 border-t bg-muted/30">
                  <Button size="sm" variant="outline" onClick={addMeasurement}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar medição
                  </Button>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Etapa 4: Ocorrências ───────────────────────────────────────── */}
        <Section
          step={4}
          icon={AlertTriangle}
          title="Ocorrências do Lote"
          subtitle="Registre problemas observados durante a produção. Múltiplos tipos podem ser selecionados."
        >
          <div className="bg-background border rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OCCURRENCE_TYPES.map(type => {
                const active = occurrences.some(o => o.type === type)
                const labels: Record<BatchOccurrenceType, { label: string; desc: string }> = {
                  CAPPING:    { label: 'Capping',     desc: 'Separação de camadas' },
                  STICKING:   { label: 'Sticking',    desc: 'Aderência ao punção' },
                  TRAVAMENTO: { label: 'Travamento',  desc: 'Punção travou na máquina' },
                  QUEBRA:     { label: 'Quebra',      desc: 'Punção quebrado' },
                  OXIDACAO:   { label: 'Oxidação',    desc: 'Corrosão detectada' },
                  OUTROS:     { label: 'Outros',      desc: 'Outras ocorrências' },
                }
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleOccurrence(type)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      active
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border hover:border-destructive/50 text-foreground'
                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <p className="font-medium text-sm">{labels[type].label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{labels[type].desc}</p>
                    {active && <p className="text-xs text-destructive font-medium mt-1">Registrado</p>}
                  </button>
                )
              })}
            </div>
            {occurrences.length > 0 && (
              <p className="text-xs text-destructive font-medium mt-3">
                {occurrences.length} ocorrência(s) registrada(s): {occurrences.map(o => o.type).join(', ')}
              </p>
            )}
          </div>
        </Section>

        {/* ── Etapa 5: Observações e Finalização ────────────────────────── */}
        <Section
          step={5}
          icon={MessageSquare}
          title="Observações e Finalização"
          subtitle="Registre os KG produzidos, observações do operador e do técnico de punções, e conclua o lote."
        >
          <div className="bg-background border rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">KG Produzidos</Label>
                <div className="relative">
                  <Input type="number" step="0.1" value={form.kgProduzidos} onChange={e => setField('kgProduzidos', e.target.value)} disabled={!canEdit} placeholder="ex: 450.5" />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">kg</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Separado por</Label>
                <Input value={form.separadoPor} onChange={e => setField('separadoPor', e.target.value)} disabled={!canEdit} placeholder="Nome do responsável" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observações do Operador</Label>
              <textarea
                className="w-full min-h-[72px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                value={form.observacoesOperador}
                onChange={e => setField('observacoesOperador', e.target.value)}
                disabled={!canEdit}
                placeholder="Condições observadas durante a produção..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observações do Técnico de Punções</Label>
              <textarea
                className="w-full min-h-[72px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                value={form.observacoesTecnico}
                onChange={e => setField('observacoesTecnico', e.target.value)}
                disabled={!canEdit}
                placeholder="Avaliação técnica sobre o estado dos punções..."
              />
            </div>

            {canEdit && (
              <div className="pt-2 border-t flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={saveMutation.isPending || !canSubmit}
                  onClick={() => saveMutation.mutate('DRAFT')}
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <ClipboardList className="h-4 w-4" />
                  Salvar como Rascunho
                </Button>
                <Button
                  className="flex-1"
                  disabled={saveMutation.isPending || !canSubmit}
                  onClick={() => saveMutation.mutate('COMPLETED')}
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Concluir Lote
                </Button>
              </div>
            )}

            {!canSubmit && (
              <p className="text-xs text-muted-foreground text-center">
                Preencha Produto, Máquina, Jogo e Nº do Lote para salvar
              </p>
            )}
          </div>
        </Section>

        {/* Fim do fluxo */}
        <div className="flex justify-center pb-4">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
          </div>
        </div>
      </div>
    </div>
  )
}
