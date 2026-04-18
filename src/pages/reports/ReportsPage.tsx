import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PunchSet, DimensionRecord, Occurrence, OccurrenceType, OccurrenceStatus, SetStatus } from '@/types'

const TYPE_LABELS: Record<OccurrenceType, string> = {
  COMPRESSION: 'Compressão',
  DIMENSIONAL: 'Dimensional',
  MAINTENANCE: 'Manutenção',
  OTHER: 'Outro',
}

const STATUS_LABELS_OCC: Record<OccurrenceStatus, string> = {
  OPEN: 'Aberta',
  MONITORING: 'Monitoramento',
  CLOSED: 'Encerrada',
}

const STATUS_LABELS_SET: Record<SetStatus, string> = {
  ACTIVE: 'Ativo',
  IN_REPAIR: 'Em Reparo',
  INACTIVE: 'Inativo',
  DISCARDED: 'Descartado',
}

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF'
  const csv = bom + [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'dimensional' | 'ocorrencias' | 'conjuntos'>('conjuntos')
  const [selectedSetId, setSelectedSetId] = useState<string>('')

  const { data: sets = [] } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets'],
    queryFn: () => api.get('/punch-sets').then((r) => r.data),
  })

  const { data: records = [] } = useQuery<DimensionRecord[]>({
    queryKey: ['dimension-records', selectedSetId],
    queryFn: () => api.get(`/punch-sets/${selectedSetId}/dimension-records`).then((r) => r.data),
    enabled: !!selectedSetId && activeTab === 'dimensional',
  })

  const { data: occurrences = [] } = useQuery<Occurrence[]>({
    queryKey: ['occurrences'],
    queryFn: () => api.get('/occurrences').then((r) => r.data),
    enabled: activeTab === 'ocorrencias',
  })

  function exportConjuntos() {
    exportCSV(
      `conjuntos_${format(new Date(), 'yyyyMMdd')}.csv`,
      ['Código', 'Nome', 'Status', 'Vida Útil %', 'Punções', 'Ocorrências', 'Empresa', 'Criado em'],
      sets.map((s) => [
        s.code,
        s.name,
        STATUS_LABELS_SET[s.status],
        s.usefulValue.toFixed(1),
        String(s._count.punches),
        String(s._count.occurrences),
        s.company.name,
        format(new Date(s.createdAt), 'dd/MM/yyyy'),
      ])
    )
  }

  function exportDimensional() {
    const rows: string[][] = []
    for (const r of records) {
      for (const v of r.values) {
        rows.push([
          format(new Date(r.measuredAt), 'dd/MM/yyyy HH:mm'),
          v.parameter,
          String(v.value),
          v.unit,
          v.lowerLimit != null ? String(v.lowerLimit) : '',
          v.upperLimit != null ? String(v.upperLimit) : '',
          v.isOk ? 'OK' : 'NOK',
          r.notes ?? '',
        ])
      }
    }
    exportCSV(
      `dimensional_${format(new Date(), 'yyyyMMdd')}.csv`,
      ['Data', 'Parâmetro', 'Valor', 'Unidade', 'Lim. Inf.', 'Lim. Sup.', 'Status', 'Observações'],
      rows
    )
  }

  function exportOcorrencias() {
    exportCSV(
      `ocorrencias_${format(new Date(), 'yyyyMMdd')}.csv`,
      ['Conjunto', 'Tipo', 'Status', 'Máquina', 'Produto', 'Descrição', 'Resolução', 'Aberta em', 'Encerrada em'],
      occurrences.map((o) => [
        `${o.set.code} - ${o.set.name}`,
        TYPE_LABELS[o.type],
        STATUS_LABELS_OCC[o.status],
        o.machine?.name ?? '',
        o.product?.name ?? '',
        o.description,
        o.resolution ?? '',
        format(new Date(o.openedAt), 'dd/MM/yyyy'),
        o.closedAt ? format(new Date(o.closedAt), 'dd/MM/yyyy') : '',
      ])
    )
  }

  const tabs = [
    { id: 'conjuntos' as const, label: 'Conjuntos', icon: BarChart3 },
    { id: 'dimensional' as const, label: 'Dimensional', icon: FileText },
    { id: 'ocorrencias' as const, label: 'Ocorrências', icon: FileText },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Relatórios e Exportação</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Geração e exportação de dados para uso externo</p>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'conjuntos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{sets.length} conjuntos cadastrados</p>
            <Button size="sm" variant="outline" onClick={exportConjuntos} disabled={sets.length === 0}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vida Útil</TableHead>
                  <TableHead>Punções</TableHead>
                  <TableHead>Empresa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sets.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum conjunto</TableCell></TableRow>
                ) : sets.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell><Badge variant="secondary">{STATUS_LABELS_SET[s.status]}</Badge></TableCell>
                    <TableCell className="tabular-nums">{s.usefulValue.toFixed(1)}%</TableCell>
                    <TableCell>{s._count.punches}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.company.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === 'dimensional' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="space-y-1.5 flex-1 max-w-sm">
              <Label>Conjunto</Label>
              <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                <SelectTrigger><SelectValue placeholder="Selecione um conjunto..." /></SelectTrigger>
                <SelectContent>
                  {sets.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedSetId && (
              <div className="pt-6">
                <Button size="sm" variant="outline" onClick={exportDimensional} disabled={records.length === 0}>
                  <Download className="h-4 w-4" /> Exportar CSV
                </Button>
              </div>
            )}
          </div>
          {selectedSetId ? (
            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Parâmetro</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Lim. Inf.</TableHead>
                    <TableHead>Lim. Sup.</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro</TableCell></TableRow>
                  ) : records.flatMap((r) =>
                    r.values.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(r.measuredAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="text-sm">{v.parameter}</TableCell>
                        <TableCell className="tabular-nums">{v.value} {v.unit}</TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">{v.lowerLimit ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">{v.upperLimit ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={v.isOk ? 'success' : 'destructive'}>{v.isOk ? 'OK' : 'NOK'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Selecione um conjunto para ver os registros dimensionais</CardContent></Card>
          )}
        </div>
      )}

      {activeTab === 'ocorrencias' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{occurrences.length} ocorrências</p>
            <Button size="sm" variant="outline" onClick={exportOcorrencias} disabled={occurrences.length === 0}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conjunto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Aberta em</TableHead>
                  <TableHead>Encerrada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occurrences.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma ocorrência</TableCell></TableRow>
                ) : occurrences.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.set.code}</TableCell>
                    <TableCell><Badge variant="secondary">{TYPE_LABELS[o.type]}</Badge></TableCell>
                    <TableCell><Badge variant={o.status === 'OPEN' ? 'destructive' : o.status === 'MONITORING' ? 'warning' : 'success'}>{STATUS_LABELS_OCC[o.status]}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{o.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(o.openedAt), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.closedAt ? format(new Date(o.closedAt), 'dd/MM/yyyy') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
