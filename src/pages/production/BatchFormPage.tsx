import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, Printer, Download, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { useAuth } from '@/hooks/useAuth'
import type {
  ProductionBatch, ProductionConfig,
  BatchFixedParam, BatchHourlyMeasurement, BatchOccurrence,
  BatchOccurrenceType, Product, Machine, PunchSet,
} from '@/types'
import { format } from 'date-fns'

const BRAND: [number, number, number] = [240, 89, 34]

const OCCURRENCE_TYPES: BatchOccurrenceType[] = ['CAPPING', 'STICKING', 'TRAVAMENTO', 'QUEBRA', 'OXIDACAO', 'OUTROS']

// ── PDF geração ───────────────────────────────────────────────────────────────

function generateBlankPdf(batch: Partial<BatchData>, config: ProductionConfig | null, numHoras: number) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, doc.internal.pageSize.width, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTROLE DE PARÂMETROS E PROCESSO', 14, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Punch Control · Punch Care', 14, 15)

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const info = [
    `Lote: ${batch.loteNumero || '___________'}`,
    `Data: ${batch.dataProducao || '___/___/______'}`,
    `Hora: ${batch.horaInicio || '__:__'}`,
  ]
  doc.text(info.join('     '), 14, 25)

  // Parâmetros fixos
  const params = config?.params ?? []
  if (params.length > 0) {
    autoTable(doc, {
      startY: 30,
      head: [['Parâmetro', 'Un.', 'Mín.', 'Máx.', 'Sugerido', 'Real']],
      body: params.map(p => [p.nome, p.unidade ?? '', p.minimo ?? '', p.maximo ?? '', p.sugerido ?? '', '']),
      headStyles: { fillColor: BRAND, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 5: { minCellWidth: 25 } },
      margin: { left: 14, right: 14 },
    })
  }

  const afterFixed = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 30

  // Medições horárias
  const hourRows = Array.from({ length: numHoras }, (_, i) => [
    `${String(i + 1).padStart(2, '0')}:00`, '', '', '', '', '', '', '', '', '', '',
  ])

  autoTable(doc, {
    startY: afterFixed + 6,
    head: [['Hora', 'Rolo Cmp. Dir.', 'Rolo Cmp. Esq.', 'Rampa Dos. Esq.', 'Rampa Dos. Dir.', 'CFC L1', 'CFC L2', 'CV L1 (%)', 'CV L2 (%)', 'Responsável', 'Observações']],
    body: hourRows,
    headStyles: { fillColor: [70, 130, 180], fontSize: 7, fontStyle: 'bold', textColor: [255, 255, 255] },
    bodyStyles: { fontSize: 7, minCellHeight: 7 },
    margin: { left: 14, right: 14 },
  })

  const afterHourly = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? afterFixed + 6

  // Ocorrências e observações
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Ocorrências:', 14, afterHourly + 8)
  doc.setFont('helvetica', 'normal')
  doc.text('□ Capping   □ Sticking   □ Travamento   □ Quebra   □ Oxidação   □ Outros: ____________', 40, afterHourly + 8)
  doc.text(`KG Produzidos: _________    Separado por: _________________________`, 14, afterHourly + 15)
  doc.text('Obs. Operador: ___________________________________________________________________________', 14, afterHourly + 22)
  doc.text('Obs. Técnico:  ___________________________________________________________________________', 14, afterHourly + 29)

  doc.save(`formulario_lote_${batch.loteNumero || 'em_branco'}.pdf`)
}

function generateCompletedPdf(batch: ProductionBatch) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, doc.internal.pageSize.width, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('REGISTRO DE LOTE — CONTROLE DE PARÂMETROS E PROCESSO', 14, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Punch Control · Punch Care', 14, 15)

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(9)
  doc.text([
    `Lote: ${batch.loteNumero}`,
    `Data: ${format(new Date(batch.dataProducao), 'dd/MM/yyyy')}  ${batch.horaInicio}`,
    `Produto: ${batch.product.name}`,
    `Máquina: ${batch.machine.name}`,
    `Conjunto: ${batch.punchSet.code} — ${batch.punchSet.name}`,
  ].join('     '), 14, 25)

  const fp = batch.fixedParams ?? []
  if (fp.length > 0) {
    autoTable(doc, {
      startY: 30,
      head: [['Parâmetro', 'Un.', 'Mín.', 'Máx.', 'Sugerido', 'Real', 'Status']],
      body: fp.map(p => [
        p.nome,
        p.unidade ?? '—',
        p.minimo ?? '—',
        p.maximo ?? '—',
        p.sugerido ?? '—',
        p.valorReal ?? '—',
        p.isOk === null ? '—' : p.isOk ? '✅' : '⚠️',
      ]),
      headStyles: { fillColor: BRAND, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    })
  }

  const afterFixed = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 30

  const hourly = batch.hourlyMeasurements ?? []
  if (hourly.length > 0) {
    autoTable(doc, {
      startY: afterFixed + 6,
      head: [['Hora', 'Rolo Dir.', 'Rolo Esq.', 'Rampa Esq.', 'Rampa Dir.', 'CFC L1', 'CFC L2', 'CV L1', 'CV L2', 'Responsável', 'Obs.']],
      body: hourly.map(m => [
        m.horario,
        m.roloCmpDir ?? '—', m.roloCmpEsq ?? '—',
        m.rampaDosEsq ?? '—', m.rampaDosDir ?? '—',
        m.pressaoCFCL1 ?? '—', m.pressaoCFCL2 ?? '—',
        m.coefVarL1 ?? '—', m.coefVarL2 ?? '—',
        m.responsavel ?? '—', m.observacoes ?? '',
      ]),
      headStyles: { fillColor: [70, 130, 180], fontSize: 7, fontStyle: 'bold', textColor: [255, 255, 255] },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    })
  }

  const afterHourly = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? afterFixed + 6

  doc.setFontSize(8)
  const occs = (batch.batchOccurrences ?? []).map(o => o.type).join(', ')
  doc.text(`Ocorrências: ${occs || 'Nenhuma'}`, 14, afterHourly + 8)
  doc.text(`KG Produzidos: ${batch.kgProduzidos ?? '—'}    Separado por: ${batch.separadoPor ?? '—'}`, 14, afterHourly + 15)
  doc.text(`Obs. Operador: ${batch.observacoesOperador ?? '—'}`, 14, afterHourly + 22)
  doc.text(`Obs. Técnico:  ${batch.observacoesTecnico ?? '—'}`, 14, afterHourly + 29)

  doc.save(`registro_lote_${batch.loteNumero}.pdf`)
}

// ── Tipos locais do form ──────────────────────────────────────────────────────

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

interface LocalFixedParam extends Omit<BatchFixedParam, 'id' | 'batchId'> {
  valorReal: number | null
}
interface LocalMeasurement extends Omit<BatchHourlyMeasurement, 'id' | 'batchId'> {}
interface LocalOccurrence extends Omit<BatchOccurrence, 'id' | 'batchId'> {}

// ── Componente principal ──────────────────────────────────────────────────────

export function BatchFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()
  const { user } = useAuth()
  const { companyId: adminCompanyId } = useAdminCompany()
  const p = t.production
  const isEdit = !!id
  const canEdit = user?.role !== 'CLIENT'

  const [form, setForm] = useState<BatchData>({
    configId: '', productId: '', machineId: '', punchSetId: '',
    loteNumero: '', dataProducao: format(new Date(), 'yyyy-MM-dd'),
    horaInicio: format(new Date(), 'HH:mm'),
    duracaoEstimadaHoras: '8', kgProduzidos: '',
    observacoesOperador: '', observacoesTecnico: '',
    separadoPor: '', status: 'DRAFT',
  })
  const [fixedParams, setFixedParams] = useState<LocalFixedParam[]>([])
  const [measurements, setMeasurements] = useState<LocalMeasurement[]>([])
  const [occurrences, setOccurrences] = useState<LocalOccurrence[]>([])

  // Queries
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', adminCompanyId],
    queryFn: () => api.get('/products', { params: { companyId: adminCompanyId } }).then(r => r.data),
  })
  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['machines', adminCompanyId],
    queryFn: () => api.get('/occurrences/machines', { params: { companyId: adminCompanyId } }).then(r => r.data),
  })
  const { data: sets = [] } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets', adminCompanyId],
    queryFn: () => api.get('/punch-sets', { params: { companyId: adminCompanyId } }).then(r => r.data),
  })

  const { data: config } = useQuery<ProductionConfig | null>({
    queryKey: ['production-config-by-product-machine', form.productId, form.machineId],
    queryFn: async () => {
      if (!form.productId || !form.machineId) return null
      const configs = await api.get('/production-configs', {
        params: { companyId: adminCompanyId },
      }).then(r => r.data as ProductionConfig[])
      return configs.find(c => c.productId === form.productId && c.machineId === form.machineId) ?? null
    },
    enabled: !!form.productId && !!form.machineId,
  })

  const { data: existingBatch } = useQuery<ProductionBatch>({
    queryKey: ['production-batch', id],
    queryFn: () => api.get(`/production-batches/${id}`).then(r => r.data),
    enabled: isEdit,
  })

  // Load existing batch data when editing
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
    setFixedParams((existingBatch.fixedParams ?? []).map(fp => ({ ...fp })))
    setMeasurements((existingBatch.hourlyMeasurements ?? []).map(m => ({ ...m })))
    setOccurrences((existingBatch.batchOccurrences ?? []).map(o => ({ type: o.type, notas: o.notas })))
  }, [existingBatch])

  // Auto-load fixed params from config when config is found and no params yet
  useEffect(() => {
    if (!config || fixedParams.length > 0) return
    setFixedParams(config.params.map(pr => ({
      ordem: pr.ordem,
      nome: pr.nome,
      unidade: pr.unidade,
      minimo: pr.minimo,
      maximo: pr.maximo,
      sugerido: pr.sugerido,
      valorReal: null,
      isOk: null,
    })))
    setForm(f => ({ ...f, configId: config.id }))
  }, [config])

  const updateFixedParam = (idx: number, value: string) => {
    setFixedParams(prev => prev.map((p, i) => {
      if (i !== idx) return p
      const valorReal = value === '' ? null : parseFloat(value.replace(',', '.'))
      const isOk = valorReal === null || (p.minimo === null && p.maximo === null)
        ? null
        : (p.minimo === null || valorReal >= p.minimo) && (p.maximo === null || valorReal <= p.maximo)
      return { ...p, valorReal: isNaN(valorReal as number) ? null : valorReal, isOk }
    }))
  }

  const addMeasurement = () => {
    const lastHour = measurements.length > 0
      ? parseInt(measurements[measurements.length - 1].horario.split(':')[0]) + 1
      : parseInt(form.horaInicio.split(':')[0])
    setMeasurements(prev => [...prev, {
      ordem: prev.length + 1,
      horario: `${String(lastHour % 24).padStart(2, '0')}:00`,
      roloCmpDir: null, roloCmpEsq: null,
      rampaDosEsq: null, rampaDosDir: null,
      pressaoCFCL1: null, pressaoCFCL2: null,
      coefVarL1: null, coefVarL2: null,
      responsavel: null, observacoes: null,
    }])
  }

  const updateMeasurement = (idx: number, field: keyof LocalMeasurement, value: string) => {
    setMeasurements(prev => prev.map((m, i) => {
      if (i !== idx) return m
      if (field === 'horario' || field === 'responsavel' || field === 'observacoes') {
        return { ...m, [field]: value || null }
      }
      const n = parseFloat(value.replace(',', '.'))
      return { ...m, [field]: isNaN(n) ? null : n }
    }))
  }

  const removeMeasurement = (idx: number) => {
    setMeasurements(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, ordem: i + 1 })))
  }

  const toggleOccurrence = (type: BatchOccurrenceType) => {
    setOccurrences(prev => {
      const exists = prev.find(o => o.type === type)
      if (exists) return prev.filter(o => o.type !== type)
      return [...prev, { type, notas: null }]
    })
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
    mutationFn: (status: 'DRAFT' | 'COMPLETED') => isEdit
      ? api.put(`/production-batches/${id}`, buildPayload(status))
      : api.post('/production-batches', buildPayload(status)),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['production-batches'] })
      toast.success(isEdit ? p.updated : p.created)
      if (status === 'COMPLETED') navigate('/production')
    },
    onError: () => toast.error(isEdit ? p.updateError : p.createError),
  })

  const numHoras = parseInt(form.duracaoEstimadaHoras) || 8

  const hasAlerts = fixedParams.some(fp => fp.isOk === false)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/production')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight">
            {isEdit ? p.editBatch : p.newBatch}
            {form.loteNumero && <span className="ml-2 font-mono text-primary"> {form.loteNumero}</span>}
          </h2>
          {form.status && (
            <Badge variant={form.status === 'COMPLETED' ? 'success' : 'secondary'} className="mt-0.5">
              {form.status === 'COMPLETED' ? p.statusCompleted : p.statusDraft}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline" size="sm"
            onClick={() => generateBlankPdf(form, config ?? null, numHoras)}
          >
            <Printer className="h-4 w-4" /> {p.generateBlankPdf}
          </Button>
          {isEdit && existingBatch && existingBatch.status === 'COMPLETED' && (
            <Button variant="outline" size="sm" onClick={() => generateCompletedPdf(existingBatch)}>
              <Download className="h-4 w-4" /> {p.downloadPdf}
            </Button>
          )}
        </div>
      </div>

      {/* Seção 1: Identificação */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Identificação do Lote</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{p.loteNumero} *</Label>
              <Input placeholder={p.loteNumeroPlaceholder} value={form.loteNumero} onChange={e => setForm(f => ({ ...f, loteNumero: e.target.value }))} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label>{p.dataProducao} *</Label>
              <Input type="date" value={form.dataProducao} onChange={e => setForm(f => ({ ...f, dataProducao: e.target.value }))} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label>{p.horaInicio} *</Label>
              <Input type="time" value={form.horaInicio} onChange={e => setForm(f => ({ ...f, horaInicio: e.target.value }))} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label>Produto *</Label>
              <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder={p.selectProductRequired} /></SelectTrigger>
                <SelectContent>{products.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Máquina *</Label>
              <Select value={form.machineId} onValueChange={v => setForm(f => ({ ...f, machineId: v }))} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder={p.selectMachineRequired} /></SelectTrigger>
                <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Conjunto de Punções *</Label>
              <Select value={form.punchSetId} onValueChange={v => setForm(f => ({ ...f, punchSetId: v }))} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder={p.selectSetRequired} /></SelectTrigger>
                <SelectContent>{sets.map(s => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{p.duracaoEstimada}</Label>
              <Input type="number" min="1" max="48" placeholder={p.duracaoPlaceholder} value={form.duracaoEstimadaHoras} onChange={e => setForm(f => ({ ...f, duracaoEstimadaHoras: e.target.value }))} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label>{p.kgProduzidos}</Label>
              <Input type="number" step="0.01" value={form.kgProduzidos} onChange={e => setForm(f => ({ ...f, kgProduzidos: e.target.value }))} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label>{p.separadoPor}</Label>
              <Input value={form.separadoPor} onChange={e => setForm(f => ({ ...f, separadoPor: e.target.value }))} disabled={!canEdit} />
            </div>
          </div>

          {config && (
            <p className="mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5">
              ✓ Configuração de processo encontrada para {config.product.name} + {config.machine.name}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Seção 2: Parâmetros Fixos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            {p.paramsFixos}
            {hasAlerts && <Badge variant="destructive" className="text-xs">⚠ Desvios encontrados</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fixedParams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {config
                ? 'Carregando parâmetros...'
                : 'Selecione Produto + Máquina para carregar os parâmetros configurados.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium min-w-[200px]">{p.paramName}</th>
                    <th className="text-center py-2 px-2 font-medium w-16">{p.paramUnit}</th>
                    <th className="text-center py-2 px-2 font-medium w-20">{p.paramMin}</th>
                    <th className="text-center py-2 px-2 font-medium w-20">{p.paramMax}</th>
                    <th className="text-center py-2 px-2 font-medium w-20">{p.paramSugerido}</th>
                    <th className="text-center py-2 px-2 font-medium w-28">{p.paramReal}</th>
                    <th className="text-center py-2 px-2 font-medium w-16">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fixedParams.map((fp, idx) => (
                    <tr key={idx} className={`border-b ${fp.isOk === false ? 'bg-red-50' : ''}`}>
                      <td className="py-1.5 pr-4">{fp.nome}</td>
                      <td className="py-1.5 px-2 text-center text-muted-foreground text-xs">{fp.unidade ?? '—'}</td>
                      <td className="py-1.5 px-2 text-center text-xs">{fp.minimo ?? '—'}</td>
                      <td className="py-1.5 px-2 text-center text-xs">{fp.maximo ?? '—'}</td>
                      <td className="py-1.5 px-2 text-center text-xs">{fp.sugerido ?? '—'}</td>
                      <td className="py-1.5 px-2">
                        <Input
                          className="h-7 text-sm text-center"
                          value={fp.valorReal?.toString() ?? ''}
                          onChange={e => updateFixedParam(idx, e.target.value)}
                          disabled={!canEdit}
                          placeholder="—"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {fp.isOk === null ? '—' : fp.isOk ? '✅' : '⚠️'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção 3: Medições Horárias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            {p.medicoesHorarias}
            {canEdit && (
              <Button size="sm" variant="outline" onClick={addMeasurement}>
                <Plus className="h-3 w-3" /> {p.addMedicao}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {measurements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma medição registrada. Clique em "{p.addMedicao}" para adicionar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium w-16">{p.horario}</th>
                    <th className="text-center py-2 px-1 font-medium">{p.roloCmpDir}</th>
                    <th className="text-center py-2 px-1 font-medium">{p.roloCmpEsq}</th>
                    <th className="text-center py-2 px-1 font-medium">{p.rampaDosEsq}</th>
                    <th className="text-center py-2 px-1 font-medium">{p.rampaDosDir}</th>
                    <th className="text-center py-2 px-1 font-medium">{p.pressaoCFCL1}</th>
                    <th className="text-center py-2 px-1 font-medium">{p.pressaoCFCL2}</th>
                    <th className="text-center py-2 px-1 font-medium">{p.coefVarL1}</th>
                    <th className="text-center py-2 px-1 font-medium">{p.coefVarL2}</th>
                    <th className="text-center py-2 px-1 font-medium">{p.responsavel}</th>
                    <th className="text-center py-2 px-1 font-medium">Obs.</th>
                    {canEdit && <th className="w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-1 px-1">
                        <Input className="h-7 text-xs w-16" value={m.horario} onChange={e => updateMeasurement(idx, 'horario', e.target.value)} disabled={!canEdit} />
                      </td>
                      {(['roloCmpDir', 'roloCmpEsq', 'rampaDosEsq', 'rampaDosDir', 'pressaoCFCL1', 'pressaoCFCL2', 'coefVarL1', 'coefVarL2'] as const).map(field => (
                        <td key={field} className="py-1 px-1">
                          <Input className="h-7 text-xs w-20 text-center" value={m[field]?.toString() ?? ''} onChange={e => updateMeasurement(idx, field, e.target.value)} disabled={!canEdit} placeholder="—" />
                        </td>
                      ))}
                      <td className="py-1 px-1">
                        <Input className="h-7 text-xs w-24" value={m.responsavel ?? ''} onChange={e => updateMeasurement(idx, 'responsavel', e.target.value)} disabled={!canEdit} />
                      </td>
                      <td className="py-1 px-1">
                        <Input className="h-7 text-xs w-32" value={m.observacoes ?? ''} onChange={e => updateMeasurement(idx, 'observacoes', e.target.value)} disabled={!canEdit} />
                      </td>
                      {canEdit && (
                        <td className="py-1 px-1">
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
          )}
        </CardContent>
      </Card>

      {/* Seção 4: Ocorrências */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{p.ocorrencias}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {OCCURRENCE_TYPES.map(type => {
              const active = occurrences.some(o => o.type === type)
              return (
                <button
                  key={type}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleOccurrence(type)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-destructive text-white border-destructive'
                      : 'border-border text-muted-foreground hover:border-destructive hover:text-destructive'
                  }`}
                >
                  {p[type]}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Seção 5: Observações */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Observações e Finalização</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{p.observacoesOperador}</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.observacoesOperador}
              onChange={e => setForm(f => ({ ...f, observacoesOperador: e.target.value }))}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{p.observacoesTecnico}</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.observacoesTecnico}
              onChange={e => setForm(f => ({ ...f, observacoesTecnico: e.target.value }))}
              disabled={!canEdit}
            />
          </div>

          {canEdit && (
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate('DRAFT')}
                disabled={saveMutation.isPending || !form.productId || !form.machineId || !form.punchSetId || !form.loteNumero}
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Rascunho
              </Button>
              <Button
                onClick={() => saveMutation.mutate('COMPLETED')}
                disabled={saveMutation.isPending || !form.productId || !form.machineId || !form.punchSetId || !form.loteNumero}
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Concluir Lote
              </Button>
              {isEdit && existingBatch && (
                <Button variant="secondary" onClick={() => generateCompletedPdf(existingBatch)}>
                  <Download className="h-4 w-4" /> {p.downloadPdf}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
