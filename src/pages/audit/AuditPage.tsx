import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocale } from '@/hooks/useLocale'
import { useAuth } from '@/hooks/useAuth'
import type { AuditLogResponse } from '@/types'

const ACTION_VARIANT: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  LOGIN: 'secondary',
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'destructive',
  OTHER: 'secondary',
}

export function AuditPage() {
  const { t } = useLocale()
  const { user } = useAuth()
  const a = t.audit

  const [action, setAction] = useState<string>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  const { data, isLoading } = useQuery<AuditLogResponse>({
    queryKey: ['audit-logs', action, from, to, page],
    queryFn: () =>
      api.get('/audit-logs', {
        params: {
          action: action || undefined,
          from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
          to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
          page,
          pageSize,
        },
      }).then((r) => r.data),
    enabled: user?.role === 'ADMIN',
  })

  if (user && user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{a.title}</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{a.subtitle}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{a.action}</Label>
          <Select value={action || '__all__'} onValueChange={(v) => { setAction(v === '__all__' ? '' : v); setPage(1) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.common.all}</SelectItem>
              <SelectItem value="LOGIN">{a.actions.LOGIN}</SelectItem>
              <SelectItem value="CREATE">{a.actions.CREATE}</SelectItem>
              <SelectItem value="UPDATE">{a.actions.UPDATE}</SelectItem>
              <SelectItem value="DELETE">{a.actions.DELETE}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{a.from}</Label>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{a.to}</Label>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} />
        </div>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{a.date}</TableHead>
              <TableHead>{a.user}</TableHead>
              <TableHead>{a.action}</TableHead>
              <TableHead>{a.endpoint}</TableHead>
              <TableHead>{a.status}</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t.common.loading}</TableCell></TableRow>
            ) : !data || data.rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{a.noLogs}</TableCell></TableRow>
            ) : data.rows.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                <TableCell className="text-xs">
                  <div className="font-medium">{log.userEmail ?? '—'}</div>
                  {log.userRole && <div className="text-muted-foreground">{log.userRole}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant={ACTION_VARIANT[log.action] ?? 'secondary'}>{a.actions[log.action as keyof typeof a.actions] ?? log.action}</Badge>
                </TableCell>
                <TableCell className="text-xs font-mono max-w-[280px] truncate">
                  <span className="text-muted-foreground">{log.method}</span> {log.path}
                </TableCell>
                <TableCell className="text-xs">{log.statusCode}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.ip ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {data && data.total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{a.total}: {data.total}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
