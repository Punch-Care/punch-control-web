import { useState, useMemo } from 'react'
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
import type { PunchSet, DimensionRecord } from '@/types'

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

export function DimensioningPage() {
  const qc = useQueryClient()
  const { t } = useLocale()
  const { companyId: adminCompanyId } = useAdminCompany()
  const [selectedSetId, setSelectedSetId] = useState<string>('')
  const [createOpen, setCreateOpen] = useState(false)

  const valueSchema = useMemo(
    () =>
      z.object({
        parameter: z.string().min(1, t.dimensioning.parameterRequired),
        value: z.coerce.number(),
        unit: z.string().default('mm'),
        lowerLimit: z.coerce.number().optional(),
        upperLimit: z.coerce.number().optional(),
      }),
    [t],
  )

  const createSchema = useMemo(
    () =>
      z.object({
        notes: z.string().optional(),
        values: z.array(valueSchema).min(1, t.dimensioning.addAtLeastOne),
      }),
    [t, valueSchema],
  )

  type FormData = z.infer<typeof createSchema>

  const { data: sets = [] } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets', adminCompanyId],
    queryFn: () => api.get('/punch-sets', { params: { companyId: adminCompanyId } }).then((r) => r.data),
  })

  const { data: records = [], isLoading } = useQuery<DimensionRecord[]>({
    queryKey: ['dimension-records', selectedSetId],
    queryFn: () => api.get(`/punch-sets/${selectedSetId}/dimension-records`).then((r) => r.data),
    enabled: !!selectedSetId,
  })

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { values: [{ parameter: '', value: 0, unit: 'mm' }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'values' })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post(`/punch-sets/${selectedSetId}/dimension-records`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dimension-records', selectedSetId] })
      setCreateOpen(false)
      reset({ values: [{ parameter: '', value: 0, unit: 'mm' }] })
      toast.success(t.dimensioning.created)
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? t.dimensioning.createError),
  })

  const selectedSet = sets.find((s) => s.id === selectedSetId)
  const nokTotal = records.reduce((acc, r) => acc + r.values.filter((v) => !v.isOk).length, 0)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{t.dimensioning.title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{t.dimensioning.subtitle}</p>
        </div>
        {selectedSetId && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t.dimensioning.newMeasurement}
          </Button>
        )}
      </div>

      <div className="space-y-1.5 max-w-sm">
        <Label>{t.dimensioning.selectSet}</Label>
        <Select value={selectedSetId} onValueChange={setSelectedSetId}>
          <SelectTrigger><SelectValue placeholder={t.dimensioning.selectSetPlaceholder} /></SelectTrigger>
          <SelectContent>
            {sets.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSet && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{t.dimensioning.totalRecords}</p><p className="text-2xl font-bold">{records.length}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{t.dimensioning.deviationsFound}</p><p className={`text-2xl font-bold ${nokTotal > 0 ? 'text-red-500' : 'text-green-500'}`}>{nokTotal}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{t.dimensioning.usefulLife}</p><p className="text-2xl font-bold">{selectedSet.usefulValue.toFixed(0)}%</p></CardContent></Card>
        </div>
      )}

      {selectedSetId ? (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.dimensioning.dateTime}</TableHead>
                <TableHead>{t.dimensioning.result}</TableHead>
                <TableHead>{t.dimensioning.parameters}</TableHead>
                <TableHead>{t.common.notes}</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t.common.loading}</TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t.dimensioning.noRecords}</TableCell></TableRow>
              ) : records.map((r) => <RecordRow key={r.id} record={r} t={t} />)}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.dimensioning.selectSetToView}
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t.dimensioning.newDimensionalMeasurement}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.common.notes}</Label>
              <Input placeholder={t.common.optional} {...register('notes')} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t.dimensioning.measuredParameters}</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ parameter: '', value: 0, unit: 'mm' })}>
                  <Plus className="h-3 w-3" /> {t.common.add}
                </Button>
              </div>
              {errors.values && <p className="text-xs text-destructive">{errors.values.message}</p>}
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 space-y-1">
                      {i === 0 && <Label className="text-xs">{t.dimensioning.parameter}</Label>}
                      <Input placeholder="ex: comprimento_sup" {...register(`values.${i}.parameter`)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      {i === 0 && <Label className="text-xs">{t.dimensioning.value}</Label>}
                      <Input type="number" step="0.001" {...register(`values.${i}.value`)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      {i === 0 && <Label className="text-xs">{t.dimensioning.unit}</Label>}
                      <Input placeholder="mm" {...register(`values.${i}.unit`)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      {i === 0 && <Label className="text-xs">{t.dimensioning.lowerLimit}</Label>}
                      <Input type="number" step="0.001" placeholder="—" {...register(`values.${i}.lowerLimit`)} />
                    </div>
                    <div className="col-span-1 space-y-1">
                      {i === 0 && <Label className="text-xs">{t.dimensioning.upperLimit}</Label>}
                      <Input type="number" step="0.001" placeholder="—" {...register(`values.${i}.upperLimit`)} />
                    </div>
                    <div className="col-span-1">
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.dimensioning.saveMeasurement}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
