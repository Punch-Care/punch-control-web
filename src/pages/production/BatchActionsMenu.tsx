import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CopyPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useLocale } from '@/hooks/useLocale'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProductionBatch } from '@/types'

/** Ações secundárias do lote num único menu "⋯" — a tela mostra só a ação principal */
export function BatchActionsMenu({ batch, onDeleted, label }: {
  batch: Pick<ProductionBatch, 'id' | 'loteNumero' | 'productId' | 'machineId' | 'punchSetId'>
  onDeleted?: () => void
  /** Mostra o texto "Mais ações" ao lado do ícone */
  label?: boolean
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useLocale()
  const b = t.batchPage
  const { canManage } = usePermissions()

  const excluir = useMutation({
    mutationFn: () => api.delete(`/production-batches/${batch.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-batches'] })
      qc.invalidateQueries({ queryKey: ['stats-dashboard'] })
      toast.success(b.deleted)
      onDeleted?.()
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e.response?.data?.message ?? t.production.deleteError),
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={label ? 'outline' : 'ghost'} size={label ? 'default' : 'icon'} aria-label={b.moreActions} title={b.moreActions}
          className={label ? '' : 'h-8 w-8'} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />{label && <span className="hidden sm:inline">{b.moreActions}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => navigate(`/operador/lote/novo/identificacao?productId=${batch.productId}&machineId=${batch.machineId}&setId=${batch.punchSetId}`)}>
          <CopyPlus /> {b.repeat}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(`/production/${batch.id}/editar`)}>
          <Pencil /> {b.editAll}
        </DropdownMenuItem>
        {canManage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive disabled={excluir.isPending}
              onSelect={() => { if (confirm(t.production.deleteBatchConfirm(batch.loteNumero))) excluir.mutate() }}>
              <Trash2 /> {b.delete}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
