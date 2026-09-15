import { useState } from 'react'
import { Loader2, KeyRound, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'

export function ChangePasswordDialog({
  open,
  onOpenChange,
  forced = false,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  forced?: boolean
}) {
  const { t } = useLocale()
  const a = t.auth
  const { changePassword, logout } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setError(null) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // Mesma regra do servidor: 8+ caracteres com letras e números
    if (next.length < 8 || !/[a-zA-Z]/.test(next) || !/\d/.test(next)) { setError(a.newPasswordRules); return }
    if (next !== confirm) { setError(a.passwordsDontMatch); return }
    setLoading(true)
    try {
      await changePassword(current, next)
      toast.success(a.passwordChanged)
      reset()
      onOpenChange(false)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? a.changePasswordError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!forced) { onOpenChange(o); if (!o) reset() } }}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => forced && e.preventDefault()} onEscapeKeyDown={(e) => forced && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {forced ? a.passwordExpiredTitle : a.changePasswordTitle}
          </DialogTitle>
        </DialogHeader>
        {forced && <p className="text-sm text-muted-foreground">{a.passwordExpiredMsg}</p>}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{a.currentPassword}</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <Label>{a.newPassword}</Label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label>{a.confirmPassword}</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          {/* Regras marcadas conforme digita: sem adivinhar por que a senha foi recusada */}
          <ul className="space-y-1 text-sm">
            {([
              [a.ruleLength, next.length >= 8],
              [a.ruleLettersNumbers, /[a-zA-Z]/.test(next) && /\d/.test(next)],
              [a.ruleMatch, next.length > 0 && next === confirm],
            ] as const).map(([rotulo, ok]) => (
              <li key={rotulo} className={`flex items-center gap-2 ${ok ? 'text-green-700' : 'text-muted-foreground'}`}>
                {ok ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} {rotulo}
              </li>
            ))}
          </ul>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {a.changePasswordTitle}
          </Button>
          {forced && (
            <button type="button" onClick={logout} className="w-full text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
              {t.nav.logout}
            </button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
