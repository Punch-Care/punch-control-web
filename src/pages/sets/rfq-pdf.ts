import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

import type { PunchSet, Company, Machine, ToolingComponent, ToolingComponentType, Product } from '@/types'
import type { Translations } from '@/lib/i18n'

const BRAND: [number, number, number] = [240, 89, 34]

const TIPO_COLUNA: { tipo: ToolingComponentType; key: 'pdfUpper' | 'pdfLower' | 'pdfDies' | 'pdfSegments' }[] = [
  { tipo: 'UPPER_PUNCH', key: 'pdfUpper' },
  { tipo: 'LOWER_PUNCH', key: 'pdfLower' },
  { tipo: 'MATRIX', key: 'pdfDies' },
  { tipo: 'SEGMENT', key: 'pdfSegments' },
]

/** Junta os raios preenchidos numa célula só, como a linha "Raio da cavidade" da planilha */
function raios(c: ToolingComponent | undefined): string {
  if (!c) return '—'
  const partes = ([1, 2, 3, 4, 5] as const)
    .map(n => [`R${n}`, c[`raioR${n}` as keyof ToolingComponent] as number | null] as const)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k} ${v}`)
  if (c.raioRa !== null && c.raioRa !== undefined) partes.push(`Ra ${c.raioRa}`)
  return partes.length ? partes.join(' · ') : '—'
}

/**
 * Gera o RFQ no formato da planilha "RFQ Cliente Punch Care" — o documento que
 * o cliente envia ao fornecedor. Uma coluna por tipo de ferramental, as mesmas
 * linhas de especificação e, no fim, as características do produto.
 */
export function generateRfqPdf(params: {
  set: PunchSet
  company: Company | undefined
  machines: Machine[]
  components: ToolingComponent[]
  products: Product[]
  caracteristicas: string[]
  t: Translations
}) {
  const { set, company, machines, components, products, caracteristicas, t } = params
  const r = t.rfq
  const opt = t.toolingOptions as Record<string, string>
  const car = t.productCharacteristics as Record<string, string>
  const txt = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '—'
    if (typeof v === 'boolean') return v ? r.yes : r.no
    return String(v)
  }
  // Opções gravadas em português saem no idioma de quem exporta
  const optTxt = (v: string | null | undefined, prefix = '') => (v ? opt[`${prefix}${v}`] ?? v : '—')
  const doc = new jsPDF({ orientation: 'portrait' })
  const W = doc.internal.pageSize.width

  doc.setFillColor(...BRAND)
  doc.rect(0, 0, W, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(r.pdfTitle, 14, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Punch Control · ${r.pdfSet} ${set.code} — ${set.name}`, 14, 17)

  const linhaY = (fallback: number) =>
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback

  const secao = (titulo: string, body: string[][], startY: number) => {
    autoTable(doc, {
      startY,
      head: [[titulo, '']],
      body,
      theme: 'grid',
      headStyles: { fillColor: BRAND, fontSize: 8.5, fontStyle: 'bold', textColor: 255 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    })
    return linhaY(startY) + 6
  }

  // ── Dados da empresa ──
  let y = secao(r.pdfCompanyData, [
    [r.pdfCompany, txt(company?.razaoSocial || company?.name)],
    [r.pdfCnpjIe, `${txt(company?.cnpj)}   ·   ${txt(company?.inscricaoEstadual)}`],
    [r.pdfAddress, `${txt(company?.logradouro)}, ${txt(company?.numero)} ${company?.complemento ?? ''}`.trim()],
    [r.pdfDistrictCityState, `${txt(company?.bairro)} · ${txt(company?.cidade)} · ${txt(company?.estado)}`],
    [r.pdfZipPhone, `${txt(company?.cep)}   ·   ${txt(company?.telefone)}`],
  ], 26)

  // ── Solicitante ──
  y = secao(r.pdfRequesterData, [
    [r.requester, txt(set.solicitante)],
    [r.role, txt(set.funcaoSolicitante)],
    [r.email, txt(set.emailSolicitante)],
    [r.phone, txt(set.telefoneSolicitante)],
  ], y)

  // ── Máquinas ──
  autoTable(doc, {
    startY: y,
    head: [[r.pdfMachineInfo, r.model, r.serial, r.year, r.pdfStations]],
    body: machines.length
      ? machines.map(m => [
          txt(m.fabricante ?? m.name), txt(m.modelo), txt(m.numeroSerie),
          txt(m.anoFabricacao), txt(m.qtdEstacao),
        ])
      : [[r.pdfNoMachine, '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: BRAND, fontSize: 8.5, fontStyle: 'bold', textColor: 255 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  })
  y = linhaY(y) + 6

  // ── Ferramental — uma coluna por tipo, como na planilha ──
  const porTipo = new Map(components.map(c => [c.type, c]))
  const col = (tipo: ToolingComponentType) => porTipo.get(tipo)

  const linhas: [string, (c: ToolingComponent | undefined) => string][] = [
    [r.rQty, c => txt(c?.qtdSolicitada)],
    [r.rDrawing, c => txt(c?.numDesenho)],
    [r.rStandard, c => optTxt(c?.norma)],
    [r.rDimensions, c => txt(c?.dimensoes)],
    [r.rLoad, c => txt(c?.cargaRealKN)],
    [r.rTips, c => txt(c?.qtdPontas)],
    [r.rFixing, c => optTxt(c?.tipoFixacao)],
    [r.rOilSeal, c => txt(c?.rebaixoRetentorOleo)],
    [r.rShape, c => optTxt(c?.formatoComprimido)],
    [r.rDepth, c => txt(c?.profundidadeCavMm)],
    [r.rRadius, c => raios(c)],
    [r.rLand, c => txt(c?.espessuraBorda)],
    [r.rSpecial, c => txt(c?.descricaoFormatoEspecial)],
    [r.rKey, c => txt(c?.contemChaveta)],
    [r.rScore, c => optTxt(c?.tipoVinco, 'SCORE_')],
    [r.rScoreConfig, c => optTxt(c?.configuracaoVinco)],
    [r.rEmbossing, c => txt(c?.gravacaoPonta)],
    [r.rTaper, c => optTxt(c?.conicoOuParalelo)],
    [r.rSteel, c => optTxt(c?.opcaoAco)],
    [r.rCoating, c => optTxt(c?.opcaoRevestimento)],
    [r.rTreatment, c => optTxt(c?.opcaoTratamento)],
  ]

  autoTable(doc, {
    startY: y,
    head: [[r.pdfToolingInfo, ...TIPO_COLUNA.map(col => r[col.key])]],
    body: linhas.map(([label, get]) => [label, ...TIPO_COLUNA.map(c => get(col(c.tipo)))]),
    theme: 'grid',
    headStyles: { fillColor: BRAND, fontSize: 7.5, fontStyle: 'bold', textColor: 255 },
    bodyStyles: { fontSize: 7 },
    columnStyles: { 0: { cellWidth: 46, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  })
  y = linhaY(y) + 6

  // ── Produtos e características ──
  autoTable(doc, {
    startY: y,
    head: [[r.pdfProductsSection, '']],
    body: [
      [r.pdfProducts, products.length ? products.map(p => p.name).join(', ') : '—'],
      [r.productCharacteristics, caracteristicas.length ? caracteristicas.map(c => car[c] ?? c).join(' · ') : '—'],
      [r.notes, txt(set.observacoesRfq)],
    ],
    theme: 'grid',
    headStyles: { fillColor: BRAND, fontSize: 8.5, fontStyle: 'bold', textColor: 255 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  })

  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.text(
    `${r.pdfGenerated} ${format(new Date(), 'dd/MM/yyyy HH:mm')} · Punch Control`,
    14,
    doc.internal.pageSize.height - 6,
  )

  doc.save(`rfq_${set.code}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}
