import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Ruler,
  AlertTriangle,
  RefreshCw,
  FileText,
  Globe,
  Building2,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeveloperCredit } from '@/components/layout/DeveloperCredit'

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md border-b border-border' : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#F05922] flex items-center justify-center">
            <span className="text-white font-bold text-xs">PC</span>
          </div>
          <span className="text-foreground font-semibold tracking-tight">Punch Control</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Funcionalidades', id: 'features' },
            { label: 'Benefícios', id: 'benefits' },
            { label: 'Sobre', id: 'about' },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground bg-white hover:bg-muted hover:text-foreground"
            >
              Entrar
            </Button>
          </Link>
          <a href="https://wa.me/5511940207989" target="_blank" rel="noreferrer">
            <Button size="sm" className="bg-[#F05922] hover:bg-[#F3931F] text-white border-0">
              Solicitar Demo
            </Button>
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-border px-6 py-4 space-y-4">
          {[
            { label: 'Funcionalidades', id: 'features' },
            { label: 'Benefícios', id: 'benefits' },
            { label: 'Sobre', id: 'about' },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="block text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              {label}
            </button>
          ))}
          <Link to="/login" onClick={() => setMenuOpen(false)}>
            <Button size="sm" className="w-full bg-[#F05922] hover:bg-[#F3931F] text-white border-0 mt-2">
              Acessar o sistema
            </Button>
          </Link>
        </div>
      )}
    </header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const navigate = useNavigate()

  return (
    <section className="relative min-h-screen bg-background flex items-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#F05922]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#F05922]/5 rounded-full blur-[80px]" />
      </div>

      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 grid lg:grid-cols-2 gap-16 items-center w-full">
        {/* Left — Copy */}
        <div>
          <span className="inline-flex items-center gap-2 text-[#F05922] text-xs font-semibold tracking-[0.15em] uppercase border border-[#F05922]/30 rounded-full px-3 py-1 bg-[#F05922]/10">
            by Punch Care
          </span>

          <h1 className="font-display text-5xl lg:text-[64px] font-semibold text-foreground mt-6 leading-[1.1] tracking-tight">
            Gestão completa dos ferramentais farmacêuticos
          </h1>

          <p className="text-muted-foreground mt-6 text-lg leading-relaxed max-w-lg">
            Punch Control integra dimensionamento, ocorrências e ciclo de vida de punções e matrizes
            em uma única plataforma web. Rastreabilidade total para a sua equipe.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-10">
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="bg-[#F05922] hover:bg-[#F3931F] text-white border-0 h-12 px-8 text-base font-medium"
            >
              Acessar o sistema <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-border text-muted-foreground bg-white hover:bg-muted hover:text-foreground h-12 px-8 text-base"
            >
              Ver funcionalidades <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-10 mt-14 pt-10 border-t border-border">
            {[
              { value: '7', label: 'Módulos integrados' },
              { value: '100%', label: 'Baseado na web' },
              { value: 'SaaS', label: 'Multi-empresa' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Dashboard mockup */}
        <div className="hidden lg:flex justify-center">
          <DashboardMockup />
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </section>
  )
}

// ─── Dashboard Mockup (visual) ────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="w-full max-w-[480px] rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/60 bg-[#111]">
      {/* Window bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#151515] border-b border-white/10">
        <div className="w-3 h-3 rounded-full bg-[#E84A43]" />
        <div className="w-3 h-3 rounded-full bg-[#F4A623]" />
        <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        <span className="ml-3 text-white/20 text-xs font-mono">punch-control.vercel.app</span>
      </div>

      <div className="flex">
        {/* Sidebar mockup */}
        <div className="w-12 bg-[#0A0A0A] border-r border-white/5 flex flex-col items-center py-4 gap-4">
          <div className="w-7 h-7 rounded-md bg-[#F05922] flex items-center justify-center">
            <span className="text-white font-bold text-[9px]">PC</span>
          </div>
          {[LayoutDashboard, Package, Ruler, AlertTriangle, RefreshCw, FileText].map((Icon, i) => (
            <div
              key={i}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                i === 0 ? 'bg-[#F05922]/20 text-[#F05922]' : 'text-white/20'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
          ))}
        </div>

        {/* Content mockup */}
        <div className="flex-1 p-4 space-y-3">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">Dashboard</p>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Jogos Ativos', value: '47', color: '#F05922' },
              { label: 'Em Reparo', value: '8', color: '#F4A623' },
              { label: 'Ocorrências', value: '3', color: '#E84A43' },
              { label: 'Descartados', value: '12', color: '#5D5D61' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                <p className="text-[9px] text-white/40">{label}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Vida útil bars */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/5 space-y-2">
            <p className="text-[9px] text-white/40 font-semibold uppercase tracking-widest">Vida Útil</p>
            {[
              { name: 'CON-2024-001', pct: 78, ok: true },
              { name: 'CON-2024-002', pct: 42, ok: true },
              { name: 'CON-2024-003', pct: 22, ok: false },
            ].map(({ name, pct, ok }) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[8px] text-white/40 font-mono">{name}</span>
                  <span className="text-[8px]" style={{ color: ok ? '#F05922' : '#E84A43' }}>{pct}%</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: ok ? '#F05922' : '#E84A43' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

const features = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard & Visualização',
    desc: 'Indicadores consolidados com gráficos U-Waveguide, BW e LDS. Visão em tempo real de todos os jogos.',
  },
  {
    icon: Package,
    title: 'Cadastro de Jogos',
    desc: 'Registre punções, matrizes e jogos com código, parâmetros e limites operacionais L30% e L60%.',
  },
  {
    icon: Ruler,
    title: 'Controle Dimensional',
    desc: 'Registre medições críticas e receba alertas automáticos de desvio dimensional por jogo.',
  },
  {
    icon: AlertTriangle,
    title: 'Controle de Ocorrências',
    desc: 'Vincule falhas a máquinas, produtos e josgos. Fluxo de status: abertura → acompanhamento → encerramento.',
  },
  {
    icon: RefreshCw,
    title: 'Ciclo de Vida',
    desc: 'Rastreabilidade completa: Ativo → Em Reparo → Inativo → Descartado. Histórico de todas as transições.',
  },
  {
    icon: FileText,
    title: 'Relatórios & Exportação',
    desc: 'Gere e exporte relatórios dimensionais e de ocorrências em formatos padronizados para auditoria.',
  },
]

function Features() {
  return (
    <section id="features" className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#F05922] text-xs font-semibold tracking-[0.15em] uppercase">
            Funcionalidades
          </span>
          <h2 className="font-display text-4xl lg:text-5xl font-semibold text-[#080808] mt-3">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-[#5D5D61] mt-4 max-w-xl mx-auto">
            Sete módulos integrados, projetados especificamente para as necessidades da indústria farmacêutica.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group p-6 rounded-2xl border border-gray-100 hover:border-[#F05922]/30 hover:shadow-lg hover:shadow-[#F05922]/5 transition-all duration-300 bg-white"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FFF4EF] flex items-center justify-center mb-4 group-hover:bg-[#F05922]/10 transition-colors">
                <Icon className="h-5 w-5 text-[#F05922]" />
              </div>
              <h3 className="font-semibold text-[#080808] mb-2">{title}</h3>
              <p className="text-[#5D5D61] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Benefits ─────────────────────────────────────────────────────────────────

const benefits = [
  {
    icon: Globe,
    title: '100% Web, sem instalação',
    desc: 'Acesse de qualquer dispositivo e navegador. Sem instalação, sem configuração. Atualizações automáticas.',
  },
  {
    icon: Building2,
    title: 'Multi-empresa SaaS',
    desc: 'Gerencie múltiplos clientes com isolamento total de dados. Cada empresa acessa apenas seus próprios registros.',
  },
  {
    icon: ShieldCheck,
    title: 'Rastreabilidade completa',
    desc: 'Log de auditoria em todas as ações. Conformidade com os requisitos da indústria farmacêutica regulada.',
  },
]

function Benefits() {
  return (
    <section id="benefits" className="bg-background py-24 px-6 border-y border-border/60">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#F05922] text-xs font-semibold tracking-[0.15em] uppercase">
            Por que Punch Control
          </span>
          <h2 className="font-display text-4xl lg:text-5xl font-semibold text-[#080808] mt-3">
            Projetado para a realidade da indústria
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F05922] flex items-center justify-center mx-auto mb-5">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-[#080808] text-lg mb-3">{title}</h3>
              <p className="text-[#5D5D61] text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────

function About() {
  return (
    <section id="about" className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-[#F05922] text-xs font-semibold tracking-[0.15em] uppercase">
            Sobre
          </span>
          <h2 className="font-display text-4xl lg:text-5xl font-semibold text-[#080808] mt-3 leading-tight">
            Desenvolvido com a expertise da Punch Care
          </h2>
          <p className="text-[#5D5D61] mt-6 leading-relaxed">
            A Punch Care é parceira da indústria farmacêutica há anos, oferecendo soluções em
            polimento, dimensionamento e representação técnica de ferramentais. O Punch Control
            nasce desse conhecimento aplicado: um software pensado por quem conhece profundamente
            as necessidades do setor.
          </p>
          <p className="text-[#5D5D61] mt-4 leading-relaxed">
            Com controle granular de permissões, relatórios exportáveis e rastreabilidade auditável,
            o sistema atende as exigências de ambientes regulados sem abrir mão da usabilidade.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 text-sm text-[#5D5D61]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F05922]" />
              Taboão da Serra, SP — Brasil
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F05922]" />
              punchcare@punchcare.com.br
            </div>
          </div>
        </div>

        {/* Accent block */}
        <div className="relative">
          <div className="aspect-square max-w-sm mx-auto rounded-3xl bg-gradient-to-br from-[#F05922] to-[#F3931F] flex items-center justify-center p-12">
            <div className="text-center text-white">
              <p className="font-display text-6xl font-semibold">PC</p>
              <p className="text-white/70 mt-2 text-sm tracking-widest uppercase">Punch Control</p>
              <div className="mt-8 space-y-2 text-left">
                {[
                  'Gestão de punções e matrizes',
                  'Controle de vida útil',
                  'Relatórios dimensionais',
                  'Rastreabilidade de ocorrências',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-white/80">
                    <div className="w-1 h-1 rounded-full bg-white/60 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Decorative dots */}
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full border-2 border-[#F05922]/20" />
          <div className="absolute -bottom-6 -left-6 w-16 h-16 rounded-full bg-[#FFE3D5]" />
        </div>
      </div>
    </section>
  )
}

// ─── CTA Section ──────────────────────────────────────────────────────────────

function CTASection() {
  const navigate = useNavigate()

  return (
    <section className="bg-background py-24 px-6 relative overflow-hidden border-t border-border">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#F05922]/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="font-display text-4xl lg:text-5xl font-semibold text-foreground leading-tight">
          Pronto para digitalizar o controle dos seus ferramentais?
        </h2>
        <p className="text-muted-foreground mt-5 text-lg">
          Entre em contato com a Punch Care e solicite acesso ao sistema.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Button
            size="lg"
            onClick={() => navigate('/login')}
            className="bg-[#F05922] hover:bg-[#F3931F] text-white border-0 h-12 px-10 text-base font-medium"
          >
            Acessar o sistema <ArrowRight className="h-4 w-4" />
          </Button>
          <a href="mailto:punchcare@punchcare.com.br">
            <Button
              size="lg"
              variant="outline"
              className="border-border text-muted-foreground bg-white hover:bg-muted hover:text-foreground h-12 px-10 text-base"
            >
              Falar com a equipe
            </Button>
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <>
      <footer className="bg-background border-t border-border px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#F05922] flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">PC</span>
            </div>
            <div>
              <span className="text-foreground font-semibold text-sm">Punch Control</span>
              <span className="text-muted-foreground text-sm"> · by Punch Care</span>
            </div>
          </div>

          <p className="text-muted-foreground text-xs text-center">
            © {new Date().getFullYear()} Punch Care Ltda. · CNPJ 27.735.726/0001-29 · Taboão da Serra, SP
          </p>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="https://www.punchcare.com.br" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
              punchcare.com.br
            </a>
            <Link to="/login" className="hover:text-foreground transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </footer>

      <div className="w-full bg-black py-3 px-4">
        <DeveloperCredit tone="inverted" className="text-center" />
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <Benefits />
      <About />
      <CTASection />
      <Footer />
    </div>
  )
}
