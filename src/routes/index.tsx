import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/landing/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { EmpresasPage } from '@/pages/empresas/EmpresasPage'
import { UsuariosPage } from '@/pages/usuarios/UsuariosPage'

export const router = createBrowserRouter([
  // Rota pública — landing page
  { path: '/', element: <LandingPage /> },

  // Rotas públicas que redirecionam para /dashboard se já autenticado
  {
    element: <PublicOnlyRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },

  // Rotas privadas
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/empresas', element: <EmpresasPage /> },
          { path: '/usuarios', element: <UsuariosPage /> },
          // Próximos módulos:
          // { path: '/conjuntos', element: <ConjuntosPage /> },
          // { path: '/dimensionamento', element: <DimensionamentoPage /> },
          // { path: '/ocorrencias', element: <OcorrenciasPage /> },
          // { path: '/ciclo-de-vida', element: <CicloDeVidaPage /> },
          // { path: '/relatorios', element: <RelatoriosPage /> },
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
])
