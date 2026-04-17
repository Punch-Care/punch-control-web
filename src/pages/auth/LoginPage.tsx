import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginForm) {
    setLoading(true)
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? 'Erro ao conectar com o servidor')
        : err instanceof Error
          ? err.message
          : 'Erro inesperado'
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
            <Label className="text-foreground/80 text-sm">E-mail</Label>
            <Input
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              className="bg-white border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#F05922]"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/80 text-sm">Senha</Label>
            <Input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="bg-white border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#F05922]"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-[#F05922] hover:bg-[#2F5DFF] text-white border-0 h-10 font-medium mt-2"
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}
