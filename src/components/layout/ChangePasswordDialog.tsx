import { useState } from 'react'
import { Loader2, KeyRound } from 'lucide-react'
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
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setError(null) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (next.length < 6) { setError(a.passwordMinLength); return }
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
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {a.changePasswordTitle}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
