import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '@/lib/api'
import { parseDateOnly } from '@/lib/utils'
import { useLocale } from '@/hooks/useLocale'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { exportCSV, BRAND_COLOR } from './report-utils'
import type { ProductionBatch } from '@/types'

/** Lotes concluídos no período, com kg, medições, problemas e quem encerrou */
export function ProductionReport({ pdfHeader, pdfFooter }: {
  pdfHeader: (doc: jsPDF, title: string, subtitle: string) => void
  pdfFooter: (doc: jsPDF) => void
}) {
  const { t, locale } = useLocale()
  const r = t.reportsProd
  const { companyId } = useAdminCompany()
  const hoje = format(new Date(), 'yyyy-MM-dd')
  const [de, setDe] = useState(format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd'))
  const [ate, setAte] = useState(hoje)

  const { data: lotes = [] } = useQuery<ProductionBatch[]>({
    queryKey: ['production-batches', companyId, 'COMPLETED'],
    queryFn: () => api.get('/production-batches', { params: { companyId, status: 'COMPLETED' } }).then(res => res.data),
  })

  const noPeriodo = lotes.filter(l => {
    const d = format(parseDateOnly(l.dataProducao), 'yyyy-MM-dd')
    return (!de || d >= de) && (!ate || d <= ate)
  })
  const totalKg = noPeriodo.reduce((s, l) => s + (l.kgProduzidos ?? 0), 0)
  const kg = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 2 })
  const linha = (l: ProductionBatch) => [
    l.loteNumero, format(parseDateOnly(l.dataProducao), 'dd/MM/yyyy'), l.product.name, l.machine.name, l.punchSet.code,
    kg(l.kgProduzidos ?? 0), String(l._count?.hourlyMeasurements ?? 0), String(l._count?.batchOccurrences ?? 0), l.closedBy ?? '—',
  ]
  const cabecalho = [r.lot, r.date, r.product, r.machine, r.set, r.kg, r.measurements, r.problems, r.closedBy]

  const csv = () => exportCSV(`producao_${de}_${ate}.csv`, cabecalho, noPeriodo.map(linha))
  const pdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    pdfHeader(doc, r.pdfTitle, `${r.pdfSubtitle(noPeriodo.length, kg(totalKg))} · ${format(parseDateOnly(de), 'dd/MM/yyyy')} – ${format(parseDateOnly(ate), 'dd/MM/yyyy')}`)
    autoTable(doc, {
      startY: 44,
      head: [cabecalho],
      body: noPeriodo.map(linha),
      headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 5: { halign: 'right' }, 6: { halign: 'center' }, 7: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    })
    pdfFooter(doc)
    doc.save(`relatorio_producao_${de}_${ate}.pdf`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">{r.from}</Label>
            <Input type="date" className="h-9 w-40" value={de} max={ate} onChange={e => setDe(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{r.to}</Label>
            <Input type="date" className="h-9 w-40" value={ate} min={de} onChange={e => setAte(e.target.value)} />
          </div>
          <p className="text-sm text-muted-foreground pb-2">{r.count(noPeriodo.length, kg(totalKg))}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={csv} disabled={noPeriodo.length === 0}><Download className="h-4 w-4" /> CSV</Button>
          <Button size="sm" onClick={pdf} disabled={noPeriodo.length === 0}><FileText className="h-4 w-4" /> PDF</Button>
        </div>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>{cabecalho.map((c, i) => <th key={c} className={`font-medium px-3 py-2.5 ${i >= 5 && i <= 7 ? 'text-right' : 'text-left'}`}>{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {noPeriodo.length === 0 ? (
              <tr><td colSpan={cabecalho.length} className="text-center py-8 text-muted-foreground">{r.empty}</td></tr>
            ) : noPeriodo.map(l => (
              <tr key={l.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 font-mono font-semibold"><Link to={`/production/${l.id}`} className="text-primary hover:underline">{l.loteNumero}</Link></td>
                <td className="px-3 py-2.5 whitespace-nowrap">{format(parseDateOnly(l.dataProducao), 'dd/MM/yyyy')}</td>
                <td className="px-3 py-2.5">{l.product.name}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{l.machine.name}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{l.punchSet.code}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{kg(l.kgProduzidos ?? 0)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{l._count?.hourlyMeasurements ?? 0}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${(l._count?.batchOccurrences ?? 0) > 0 ? 'text-red-600 font-medium' : ''}`}>{l._count?.batchOccurrences ?? 0}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{l.closedBy ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
