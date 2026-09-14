import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { parseDecimal } from '@/lib/utils'

type Props = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
  value: number | null | undefined
  onValueChange: (v: number | null) => void
}

/**
 * Campo numérico controlado que aceita vírgula decimal. Guarda o texto enquanto o
 * usuário digita ("1," ainda não é número) e só repassa valores válidos.
 */
export function DecimalInput({ value, onValueChange, ...props }: Props) {
  const [text, setText] = useState(value == null ? '' : String(value))

  // Valor mudou por fora (carregou do servidor, resetou o formulário)
  useEffect(() => {
    const atual = parseDecimal(text)
    if (value == null ? atual !== null : atual !== value) setText(value == null ? '' : String(value))
  }, [value])

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,-]/g, '')
        setText(raw)
        const n = parseDecimal(raw)
        if (n === null) onValueChange(null)
        else if (!Number.isNaN(n)) onValueChange(n)
      }}
    />
  )
}
