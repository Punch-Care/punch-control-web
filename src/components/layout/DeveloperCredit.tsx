interface DeveloperCreditProps {
  tone?: 'default' | 'inverted'
  className?: string
}

export function DeveloperCredit({ tone = 'default', className = '' }: DeveloperCreditProps) {
  const year = new Date().getFullYear()
  const isInverted = tone === 'inverted'

  return (
    <p className={`text-xs ${isInverted ? 'text-white' : 'text-muted-foreground'} ${className}`.trim()}>
      Desenvolvido pela{' '}
      <a
        href="https://suportededomingo.com.br"
        target="_blank"
        rel="noreferrer"
        className={
          isInverted
            ? 'font-semibold underline underline-offset-4 hover:text-white/80 transition-colors'
            : 'font-medium hover:text-foreground transition-colors'
        }
      >
        Suporte de Domingo
      </a>
      {' '}· Copyright © {year}. Todos os direitos reservados.
    </p>
  )
}
