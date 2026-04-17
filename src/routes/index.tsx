import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'

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
          // Módulos futuros são adicionados aqui:
          // { path: '/conjuntos', element: <ConjuntosPage /> },
          // { path: '/dimensionamento', element: <DimensionamentoPage /> },
          // { path: '/ocorrencias', element: <OcorrenciasPage /> },
          // { path: '/ciclo-de-vida', element: <CicloDeVidaPage /> },
          // { path: '/relatorios', element: <RelatoriosPage /> },
          // { path: '/usuarios', element: <UsuariosPage /> },
        ],
      },
    ],
  },
])
