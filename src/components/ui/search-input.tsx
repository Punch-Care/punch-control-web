import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/hooks/useLocale'

/** Campo de busca das listas — filtra no navegador enquanto digita. */
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { t } = useLocale()
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t.search.placeholder}
        className="pl-8 pr-8 h-9"
        aria-label={t.search.placeholder}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground" aria-label={t.search.clear}>
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
