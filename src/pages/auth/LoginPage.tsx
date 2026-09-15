import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { homeRouteFor } from '@/lib/home-route'
import { useAuthStore } from '@/store/auth.store'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { t } = useLocale()
  const [loading, setLoading] = useState(false)
  const [verSenha, setVerSenha] = useState(false)

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t.auth.invalidEmail),
        password: z.string().min(1, t.auth.passwordRequired),
      }),
    [t],
  )

  type LoginForm = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginForm) {
    setLoading(true)
    try {
      await login(data.email, data.password)
      navigate(homeRouteFor(useAuthStore.getState().user?.role))
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? t.auth.errorConnecting)
        : err instanceof Error
          ? err.message
          : t.auth.unexpectedError
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-foreground text-base">{t.auth.email}</Label>
            <Input
              id="login-email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              className="h-12 text-base bg-white border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#F05922]"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-senha" className="text-foreground text-base">{t.auth.password}</Label>
            <div className="relative">
              <Input
                id="login-senha"
                type={verSenha ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-12 text-base pr-12 bg-white border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#F05922]"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setVerSenha(v => !v)}
                aria-label={verSenha ? t.auth.hidePassword : t.auth.showPassword}
                title={verSenha ? t.auth.hidePassword : t.auth.showPassword}
                className="absolute right-1 top-1 h-10 w-10 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                {verSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-[#F05922] hover:bg-[#D94A17] text-white border-0 h-12 text-base font-semibold mt-2"
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? t.auth.signingIn : t.auth.signIn}
          </Button>
          <p className="text-sm text-muted-foreground text-center">{t.auth.forgotHint}</p>
        </form>
      </div>
    </AuthLayout>
  )
}
