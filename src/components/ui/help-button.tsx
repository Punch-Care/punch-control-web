import { useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/utils'

export type HelpContent = {
  title: string
  /** Para que serve, em uma ou duas frases */
  what: string
  /** Como usar, em passos curtos */
  steps?: string[]
  /** Dica ou cuidado importante */
  tip?: string
}

/**
 * Ícone "?" ao lado do título de um módulo ou seção. Abre uma explicação curta
 * em linguagem simples: para que serve, como usar e uma dica.
 */
export function HelpButton({ content, className, size = 'md' }: { content: HelpContent; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const [open, setOpen] = useState(false)
  const { t } = useLocale()
  const h = t.help
  const tamanho = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const icone = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={h.open(content.title)}
        title={h.open(content.title)}
        className={cn('inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex-shrink-0', tamanho, className)}
      >
        <CircleHelp className={icone} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CircleHelp className="h-5 w-5 text-primary" /> {content.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-base leading-relaxed">
            <p>{content.what}</p>
            {content.steps && content.steps.length > 0 && (
              <div>
                <p className="font-semibold mb-2">{h.howToUse}</p>
                <ol className="space-y-2">
                  {content.steps.map((passo, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="pt-0.5">{passo}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {content.tip && <p className="rounded-lg bg-muted px-3 py-2 text-sm">{content.tip}</p>}
            <button type="button" onClick={() => setOpen(false)} className="w-full h-12 rounded-xl bg-primary text-white text-base font-semibold">
              {h.gotIt}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
