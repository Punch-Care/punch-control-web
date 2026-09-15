import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { usePermissions } from '@/hooks/usePermissions'
import type { PunchSet, DimensionRecord, DimensionSpecsResponse } from '@/types'
import { HelpButton } from '@/components/ui/help-button'

function RecordRow({ record, t }: { record: DimensionRecord; t: ReturnType<typeof useLocale>['t'] }) {
  const [open, setOpen] = useState(false)
  const allOk = record.values.every((v) => v.isOk)
  const nokCount = record.values.filter((v) => !v.isOk).length

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen(!open)}>
        <TableCell className="font-medium">
          {format(new Date(record.measuredAt), 'dd/MM/yyyy HH:mm')}
        </TableCell>
        <TableCell>
          <Badge variant={allOk ? 'success' : 'destructive'}>
            {allOk ? 'OK' : `${nokCount} ${t.dimensioning.outOfLimit}`}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">{record.values.length} {t.dimensioning.parametersCount}</TableCell>
        <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{record.notes ?? '—'}</TableCell>
        <TableCell>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={5} className="p-0">
            <div className="bg-muted/30 border-t px-4 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b">
                    <th className="text-left pb-2 font-medium">{t.dimensioning.parameter}</th>
                    <th className="text-right pb-2 font-medium">{t.dimensioning.value}</th>
                    <th className="text-right pb-2 font-medium">{t.dimensioning.lowerLimit}</th>
                    <th className="text-right pb-2 font-medium">{t.dimensioning.upperLimit}</th>
                    <th className="text-center pb-2 font-medium">{t.common.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {record.values.map((v) => (
                    <tr key={v.id} className={v.isOk ? '' : 'bg-red-50 dark:bg-red-950/20'}>
                      <td className="py-1">{v.parameter}</td>
                      <td className="text-right py-1 tabular-nums">{v.value} {v.unit}</td>
                      <td className="text-right py-1 tabular-nums text-muted-foreground">{v.lowerLimit ?? '—'}</td>
                      <td className="text-right py-1 tabular-nums text-muted-foreground">{v.upperLimit ?? '—'}</td>
                      <td className="text-center py-1">
                        {v.isOk
                          ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          : <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

type SpecDraft = { parameter: string; unit: string; nominal: string; lowerLimit: string; upperLimit: string }

// Aceita vírgula ou ponto; '' vira null
const toNumber = (raw: string): number | null => {
  const t = raw.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}
const toRaw = (v: number | null | undefined) => (v == null ? '' : String(v))

function SpecEditor({
  open, onOpenChange, setId, data, t,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  setId: string
  data: DimensionSpecsResponse | undefined
  t: ReturnType<typeof useLocale>['t']
}) {
  const qc = useQueryClient()
  const d = t.dimensioning
  const [rows, setRows] = useState<SpecDraft[]>([])

  // Recarrega o rascunho sempre que o diálogo abre
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setRows((data?.specs ?? []).map((sp) => ({
        parameter: sp.parameter, unit: sp.unit, nominal: toRaw(sp.nominal),
        lowerLimit: toRaw(sp.lowerLimit), upperLimit: toRaw(sp.upperLimit),
      })))
    }
  }

  const update = (i: number, field: keyof SpecDraft, value: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))

  const importFromTooling = () => {
    const existentes = new Set(rows.map((r) => r.parameter.trim().toLowerCase()))
    const novos = (data?.sugestoesFerramental ?? [])
      .filter((sg) => !existentes.has(sg.parameter.toLowerCase()))
      .map((sg) => ({ parameter: sg.parameter, unit: sg.unit, nominal: String(sg.nominal), lowerLimit: '', upperLimit: '' }))
    if (novos.length === 0) { toast.info(d.specImportNone); return }
    setRows((r) => [...r, ...novos])
    toast.success(`${novos.length} ${d.specImported}`)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = rows
        .filter((r) => r.parameter.trim())
        .map((r) => ({
          parameter: r.parameter.trim(),
          unit: r.unit.trim() || 'mm',
          nominal: toNumber(r.nominal),
          lowerLimit: toNumber(r.lowerLimit),
          upperLimit: toNumber(r.upperLimit),
        }))
      if (payload.some((p) => [p.nominal, p.lowerLimit, p.upperLimit].some((v) => Number.isNaN(v)))) {
        return Promise.reject({ response: { data: { message: d.invalidNumber } } })
      }
      return api.put(`/punch-sets/${setId}/dimension-records/specs`, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dimension-specs', setId] })
      onOpenChange(false)
      toast.success(d.specSaved)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? d.specSaveError),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{d.specTitle}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">{d.specSubtitle}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setRows((r) => [...r, { parameter: '', unit: 'mm', nominal: '', lowerLimit: '', upperLimit: '' }])}>
            <Plus className="h-3 w-3" /> {t.common.add}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={importFromTooling}>
            {d.specImport}
          </Button>
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4 space-y-1">
                {i === 0 && <Label className="text-xs">{d.parameter}</Label>}
                <Input value={row.parameter} onChange={(e) => update(i, 'parameter', e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                {i === 0 && <Label className="text-xs">{d.nominal}</Label>}
                <Input inputMode="decimal" value={row.nominal} onChange={(e) => update(i, 'nominal', e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                {i === 0 && <Label className="text-xs">{d.lowerLimit}</Label>}
                <Input inputMode="decimal" value={row.lowerLimit} onChange={(e) => update(i, 'lowerLimit', e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                {i === 0 && <Label className="text-xs">{d.upperLimit}</Label>}
                <Input inputMode="decimal" value={row.upperLimit} onChange={(e) => update(i, 'upperLimit', e.target.value)} />
              </div>
              <div className="col-span-1 space-y-1">
                {i === 0 && <Label className="text-xs">{d.unit}</Label>}
                <Input value={row.unit} onChange={(e) => update(i, 'unit', e.target.value)} />
              </div>
              <div className="col-span-1">
                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{d.specEmpty}</p>}
        </div>
        <Button className="w-full" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t.common.save}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export function DimensioningPage() {
  const qc = useQueryClient()
  const { t } = useLocale()
  const d = t.dimensioning
  const { canManage } = usePermissions()
  const { companyId: adminCompanyId } = useAdminCompany()
  const [searchParams] = useSearchParams()
  const [selectedSetId, setSelectedSetId] = useState<string>(() => searchParams.get('setId') ?? '')
  const [createOpen, setCreateOpen] = useState(false)
  const [specOpen, setSpecOpen] = useState(false)

  // Campos como texto enquanto digita (vírgula decimal); converte na validação
  const decimal = (required: boolean) =>
    z.string().trim()
      .refine((v) => !required || v !== '', d.valueRequired)
      .refine((v) => v === '' || Number.isFinite(Number(v.replace(',', '.'))), d.invalidNumber)

  const valueSchema = useMemo(
    () =>
      z.object({
        parameter: z.string().min(1, d.parameterRequired),
        value: decimal(true),
        unit: z.string().default('mm'),
        lowerLimit: decimal(false),
        upperLimit: decimal(false),
        fromSpec: z.boolean().optional(),
      }),
    [t],
  )

  const createSchema = useMemo(
    () =>
      z.object({
        notes: z.string().optional(),
        values: z.array(valueSchema).min(1, d.addAtLeastOne),
      }),
    [d, valueSchema],
  )

  type FormData = z.infer<typeof createSchema>
  const emptyRow = { parameter: '', value: '', unit: 'mm', lowerLimit: '', upperLimit: '', fromSpec: false }

  const { data: sets = [] } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets', adminCompanyId],
    queryFn: () => api.get('/punch-sets', { params: { companyId: adminCompanyId } }).then((r) => r.data),
  })

  const { data: records = [], isLoading } = useQuery<DimensionRecord[]>({
    queryKey: ['dimension-records', selectedSetId],
    queryFn: () => api.get(`/punch-sets/${selectedSetId}/dimension-records`).then((r) => r.data),
    enabled: !!selectedSetId,
  })

  const { data: specData } = useQuery<DimensionSpecsResponse>({
    queryKey: ['dimension-specs', selectedSetId],
    queryFn: () => api.get(`/punch-sets/${selectedSetId}/dimension-records/specs`).then((r) => r.data),
    enabled: !!selectedSetId,
  })
  const specs = specData?.specs ?? []

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { values: [emptyRow] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'values' })

  // Nova medição já vem com os parâmetros da especificação — só falta o valor medido
  const openCreate = () => {
    reset({
      notes: '',
      values: specs.length
        ? specs.map((sp) => ({
            parameter: sp.parameter, value: '', unit: sp.unit,
            lowerLimit: toRaw(sp.lowerLimit), upperLimit: toRaw(sp.upperLimit), fromSpec: true,
          }))
        : [emptyRow],
    })
    setCreateOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(',', '.')))
      return api.post<{ occurrenceId: string | null }>(`/punch-sets/${selectedSetId}/dimension-records`, {
        notes: data.notes,
        values: data.values.map((v) => ({
          parameter: v.parameter, unit: v.unit, value: num(v.value),
          lowerLimit: num(v.lowerLimit), upperLimit: num(v.upperLimit),
        })),
      }).then((r) => r.data)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['dimension-records', selectedSetId] })
      qc.invalidateQueries({ queryKey: ['occurrences'] })
      setCreateOpen(false)
      if (res.occurrenceId) toast.warning(d.nokOccurrenceOpened)
      else toast.success(d.created)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? d.createError),
  })

  const selectedSet = sets.find((s) => s.id === selectedSetId)
  const nokTotal = records.reduce((acc, r) => acc + r.values.filter((v) => !v.isOk).length, 0)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{d.title}</h2>
          <HelpButton content={t.moduleHelp.dimensioning} size="md" />
        </div>
          <p className="text-muted-foreground text-sm mt-0.5">{d.subtitle}</p>
        </div>
        {selectedSetId && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {d.newMeasurement}
          </Button>
        )}
      </div>

      <div className="space-y-1.5 max-w-sm">
        <Label>{d.selectSet}</Label>
        <Select value={selectedSetId} onValueChange={setSelectedSetId}>
          <SelectTrigger><SelectValue placeholder={d.selectSetPlaceholder} /></SelectTrigger>
          <SelectContent>
            {sets.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSet && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{d.totalRecords}</p><p className="text-2xl font-bold">{records.length}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{d.deviationsFound}</p><p className={`text-2xl font-bold ${nokTotal > 0 ? 'text-red-500' : 'text-green-500'}`}>{nokTotal}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{d.usefulLife}</p><p className="text-2xl font-bold">{selectedSet.usefulValue.toFixed(0)}%</p></CardContent></Card>
        </div>
      )}

      {selectedSet && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-1">
          <p className="font-semibold text-sm">{d.specTitle}</p>
          <HelpButton content={t.moduleHelp.dimensionSpec} size="sm" />
        </div>
                <p className="text-xs text-muted-foreground">{d.specSubtitle}</p>
              </div>
              {canManage && (
                <Button size="sm" variant="outline" onClick={() => setSpecOpen(true)}>{d.specEdit}</Button>
              )}
            </div>
            {specs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{d.specEmpty}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left pb-2 font-medium">{d.parameter}</th>
                      <th className="text-right pb-2 font-medium">{d.nominal}</th>
                      <th className="text-right pb-2 font-medium">{d.lowerLimit}</th>
                      <th className="text-right pb-2 font-medium">{d.upperLimit}</th>
                      <th className="text-right pb-2 font-medium">{d.unit}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specs.map((sp) => (
                      <tr key={sp.id} className="border-b last:border-0">
                        <td className="py-1">{sp.parameter}</td>
                        <td className="text-right py-1 tabular-nums">{sp.nominal ?? '—'}</td>
                        <td className="text-right py-1 tabular-nums">{sp.lowerLimit ?? '—'}</td>
                        <td className="text-right py-1 tabular-nums">{sp.upperLimit ?? '—'}</td>
                        <td className="text-right py-1 text-muted-foreground">{sp.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedSetId ? (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{d.dateTime}</TableHead>
                <TableHead>{d.result}</TableHead>
                <TableHead>{d.parameters}</TableHead>
                <TableHead>{t.common.notes}</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t.common.loading}</TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{d.noRecords}</TableCell></TableRow>
              ) : records.map((r) => <RecordRow key={r.id} record={r} t={t} />)}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {d.selectSetToView}
          </CardContent>
        </Card>
      )}

      {selectedSetId && (
        <SpecEditor open={specOpen} onOpenChange={setSpecOpen} setId={selectedSetId} data={specData} t={t} />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{d.newDimensionalMeasurement}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.common.notes}</Label>
              <Input placeholder={t.common.optional} {...register('notes')} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{d.measuredParameters}</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => append(emptyRow)}>
                  <Plus className="h-3 w-3" /> {t.common.add}
                </Button>
              </div>
              {specs.length > 0 && <p className="text-xs text-muted-foreground">{d.fromSpec}</p>}
              {errors.values && <p className="text-xs text-destructive">{errors.values.message}</p>}
              <div className="space-y-2">
                {fields.map((field, i) => {
                  const locked = !!field.fromSpec
                  const rowErr = errors.values?.[i]
                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3 space-y-1">
                        {i === 0 && <Label className="text-xs">{d.parameter}</Label>}
                        <Input placeholder="ex: altura_total" readOnly={locked} {...register(`values.${i}.parameter`)} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        {i === 0 && <Label className="text-xs">{d.value}</Label>}
                        <Input inputMode="decimal" className={rowErr?.value ? 'border-destructive' : ''} {...register(`values.${i}.value`)} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        {i === 0 && <Label className="text-xs">{d.unit}</Label>}
                        <Input placeholder="mm" readOnly={locked} {...register(`values.${i}.unit`)} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        {i === 0 && <Label className="text-xs">{d.lowerLimit}</Label>}
                        <Input inputMode="decimal" placeholder="—" readOnly={locked} className={locked ? 'bg-muted' : ''} {...register(`values.${i}.lowerLimit`)} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        {i === 0 && <Label className="text-xs">{d.upperLimit}</Label>}
                        <Input inputMode="decimal" placeholder="—" readOnly={locked} className={locked ? 'bg-muted' : ''} {...register(`values.${i}.upperLimit`)} />
                      </div>
                      <div className="col-span-1">
                        {fields.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {d.saveMeasurement}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
