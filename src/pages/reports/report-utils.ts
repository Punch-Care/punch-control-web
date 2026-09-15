// ── CSV ───────────────────────────────────────────────────────────────────────

export function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF'
  // Aspas dentro do texto são duplicadas (padrão CSV); sem isso uma descrição com
  // aspas desalinha todas as colunas seguintes
  const cell = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = bom + [headers, ...rows].map((r) => r.map(cell).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF helpers ───────────────────────────────────────────────────────────────

export const BRAND_COLOR: [number, number, number] = [240, 89, 34]
