import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowRight, Activity } from 'lucide-react'

import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PunchSet, LifecycleEvent, SetStatus } from '@/types'

const STATUS_LABELS: Record<SetStatus, string> = {
  ACTIVE: 'Ativo',
  IN_REPAIR: 'Em Reparo',
  INACTIVE: 'Inativo',
  DISCARDED: 'Descartado',
}

const STATUS_VARIANTS: Record<SetStatus, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  IN_REPAIR: 'warning',
  INACTIVE: 'secondary',
  DISCARDED: 'destructive',
}

const STATUS_COLORS: Record<SetStatus, string> = {
  ACTIVE: 'bg-green-500',
  IN_REPAIR: 'bg-yellow-500',
  INACTIVE: 'bg-gray-400',
  DISCARDED: 'bg-red-500',
}

function StatusFlow({ sets }: { sets: PunchSet[] }) {
  const stages: SetStatus[] = ['ACTIVE', 'IN_REPAIR', 'INACTIVE', 'DISCARDED']
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {stages.map((s, i) => {
        const count = sets.filter((x) => x.status === s).length
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full ${STATUS_COLORS[s]} flex items-center justify-center text-white font-bold text-lg mx-auto`}>
                {count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{STATUS_LABELS[s]}</p>
            </div>
            {i < stages.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function LifecyclePage() {
  const [selectedSetId, setSelectedSetId] = useState<string>('')

  const { data: sets = [] } = useQuery<PunchSet[]>({
    queryKey: ['punch-sets'],
    queryFn: () => api.get('/punch-sets').then((r) => r.data),
  })

  const { data: events = [], isLoading } = useQuery<LifecycleEvent[]>({
    queryKey: ['lifecycle', selectedSetId],
    queryFn: () => api.get(`/punch-sets/${selectedSetId}/lifecycle`).then((r) => r.data),
    enabled: !!selectedSetId,
  })

  const selectedSet = sets.find((s) => s.id === selectedSetId)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Ciclo de Vida</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Rastreabilidade completa do ciclo de vida dos conjuntos</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Distribuição por Status</CardTitle></CardHeader>
        <CardContent>
          <StatusFlow sets={sets} />
        </CardContent>
      </Card>

      <div className="space-y-1.5 max-w-sm">
        <Label>Selecione o Conjunto</Label>
        <Select value={selectedSetId} onValueChange={setSelectedSetId}>
          <SelectTrigger><SelectValue placeholder="Escolha um conjunto..." /></SelectTrigger>
          <SelectContent>
            {sets.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.code} — {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSet && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-mono font-bold">{selectedSet.code}</p>
                <p className="text-sm text-muted-foreground">{selectedSet.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANTS[selectedSet.status]}>{STATUS_LABELS[selectedSet.status]}</Badge>
                <span className="text-sm text-muted-foreground">Vida útil: <strong>{selectedSet.usefulValue.toFixed(0)}%</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSetId ? (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Histórico de Eventos
          </h3>
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum evento registrado</p>
            ) : events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  {ev.fromStatus ? (
                    <>
                      <Badge variant={STATUS_VARIANTS[ev.fromStatus]} className="text-xs">{STATUS_LABELS[ev.fromStatus]}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Inicial</span>
                  )}
                  <Badge variant={STATUS_VARIANTS[ev.toStatus]} className="text-xs">{STATUS_LABELS[ev.toStatus]}</Badge>
                </div>
                <div className="flex-1 min-w-0">
                  {ev.reason && <p className="text-sm">{ev.reason}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(ev.performedAt), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecione um conjunto para ver o histórico de ciclo de vida
          </CardContent>
        </Card>
      )}
    </div>
  )
}
