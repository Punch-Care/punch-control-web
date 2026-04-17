import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { EmpresasPage } from '@/pages/empresas/EmpresasPage'
import { UsuariosPage } from '@/pages/usuarios/UsuariosPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/empresas', element: <EmpresasPage /> },
          { path: '/usuarios', element: <UsuariosPage /> },
          // Próximos módulos:
          // { path: '/conjuntos', element: <ConjuntosPage /> },
          // { path: '/dimensionamento', element: <DimensionamentoPage /> },
          // { path: '/ocorrencias', element: <OcorrenciasPage /> },
          // { path: '/ciclo-de-vida', element: <CicloDeVidaPage /> },
          // { path: '/relatorios', element: <RelatoriosPage /> },
        ],
      },
    ],
  },
])
