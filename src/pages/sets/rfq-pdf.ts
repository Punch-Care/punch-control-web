import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

import type { PunchSet, Company, Machine, ToolingComponent, ToolingComponentType, Product } from '@/types'

const BRAND: [number, number, number] = [240, 89, 34]

const TIPO_COLUNA: { tipo: ToolingComponentType; label: string }[] = [
  { tipo: 'UPPER_PUNCH', label: 'Punções superiores' },
  { tipo: 'LOWER_PUNCH', label: 'Punções inferiores' },
  { tipo: 'MATRIX', label: 'Matrizes' },
  { tipo: 'SEGMENT', label: 'Segmentos' },
]

const txt = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  return String(v)
}

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
}) {
  const { set, company, machines, components, products, caracteristicas } = params
  const doc = new jsPDF({ orientation: 'portrait' })
  const W = doc.internal.pageSize.width

  doc.setFillColor(...BRAND)
  doc.rect(0, 0, W, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMAÇÕES PARA AQUISIÇÃO DE PUNÇÕES', 14, 11)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Punch Control · Jogo ${set.code} — ${set.name}`, 14, 17)

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
  let y = secao('DADOS DA EMPRESA', [
    ['Empresa', txt(company?.razaoSocial || company?.name)],
    ['CNPJ / Inscr. Estadual', `${txt(company?.cnpj)}   ·   ${txt(company?.inscricaoEstadual)}`],
    ['Endereço', `${txt(company?.logradouro)}, ${txt(company?.numero)} ${company?.complemento ?? ''}`.trim()],
    ['Bairro / Cidade / UF', `${txt(company?.bairro)} · ${txt(company?.cidade)} · ${txt(company?.estado)}`],
    ['CEP / Telefone', `${txt(company?.cep)}   ·   ${txt(company?.telefone)}`],
  ], 26)

  // ── Solicitante ──
  y = secao('DADOS DO SOLICITANTE', [
    ['Solicitante', txt(set.solicitante)],
    ['Função', txt(set.funcaoSolicitante)],
    ['E-mail', txt(set.emailSolicitante)],
    ['Telefone', txt(set.telefoneSolicitante)],
  ], y)

  // ── Máquinas ──
  autoTable(doc, {
    startY: y,
    head: [['INFORMAÇÕES DA MÁQUINA', 'Modelo', 'Nº de série', 'Ano', 'Estações']],
    body: machines.length
      ? machines.map(m => [
          txt(m.fabricante ?? m.name), txt(m.modelo), txt(m.numeroSerie),
          txt(m.anoFabricacao), txt(m.qtdEstacao),
        ])
      : [['Nenhuma compressora vinculada', '', '', '', '']],
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
    ['Quantidade solicitada', c => txt(c?.qtdSolicitada)],
    ['Nº desenho de referência', c => txt(c?.numDesenho)],
    ['Norma', c => txt(c?.norma)],
    ['Dimensões em mm', c => txt(c?.dimensoes)],
    ['Carga real aplicada KN', c => txt(c?.cargaRealKN)],
    ['Quant. de pontas', c => txt(c?.qtdPontas)],
    ['Tipo de fixação', c => txt(c?.tipoFixacao)],
    ['Rebaixo p/ retentor de óleo', c => txt(c?.rebaixoRetentorOleo)],
    ['Formato do comprimido (Tab. A)', c => txt(c?.formatoComprimido)],
    ['Profundidade da cavidade (mm)', c => txt(c?.profundidadeCavMm)],
    ['Raio da cavidade (mm)', c => raios(c)],
    ['Espessura da borda (land)', c => txt(c?.espessuraBorda)],
    ['Descrição do formato especial', c => txt(c?.descricaoFormatoEspecial)],
    ['Contém chaveta', c => txt(c?.contemChaveta)],
    ['Tipo de vinco (Tab. B)', c => txt(c?.tipoVinco)],
    ['Configuração do vinco', c => txt(c?.configuracaoVinco)],
    ['Gravação da ponta', c => txt(c?.gravacaoPonta)],
    ['Cônico / paralelo (matriz)', c => txt(c?.conicoOuParalelo)],
    ['Opção de aço', c => txt(c?.opcaoAco)],
    ['Opção de revestimento', c => txt(c?.opcaoRevestimento)],
    ['Opção de tratamento', c => txt(c?.opcaoTratamento)],
  ]

  autoTable(doc, {
    startY: y,
    head: [['INFORMAÇÕES DO FERRAMENTAL', ...TIPO_COLUNA.map(t => t.label)]],
    body: linhas.map(([label, get]) => [label, ...TIPO_COLUNA.map(t => get(col(t.tipo)))]),
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
    head: [['PRODUTOS E CARACTERÍSTICAS', '']],
    body: [
      ['Produtos', products.length ? products.map(p => p.name).join(', ') : '—'],
      ['Características do produto', caracteristicas.length ? caracteristicas.join(' · ') : '—'],
      ['Observações', txt(set.notes)],
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
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} · Punch Control`,
    14,
    doc.internal.pageSize.height - 6,
  )

  doc.save(`rfq_${set.code}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}
