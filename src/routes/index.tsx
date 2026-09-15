import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/landing/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { CompaniesPage } from '@/pages/companies/CompaniesPage'
import { MyCompanyPage } from '@/pages/companies/MyCompanyPage'
import { MachinesPage } from '@/pages/machines/MachinesPage'
import { ProductionPage } from '@/pages/production/ProductionPage'
import { BatchFormPage } from '@/pages/production/BatchFormPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { SetsPage } from '@/pages/sets/SetsPage'
import { SetDetailPage } from '@/pages/sets/SetDetailPage'
import { DimensioningPage } from '@/pages/dimensioning/DimensioningPage'
import { OccurrencesPage } from '@/pages/occurrences/OccurrencesPage'
import { LifecyclePage } from '@/pages/lifecycle/LifecyclePage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { ProductsPage } from '@/pages/products/ProductsPage'
import { AuditPage } from '@/pages/audit/AuditPage'
import { RouteError } from '@/components/layout/RouteError'
import { OperatorLayout } from '@/pages/operator/OperatorLayout'
import { OperatorHome } from '@/pages/operator/OperatorHome'
import { NewBatch } from '@/pages/operator/NewBatch'
import { BatchRun } from '@/pages/operator/BatchRun'
import { MeasurementPage } from '@/pages/operator/MeasurementPage'
import { FinishBatch } from '@/pages/operator/FinishBatch'
import { BatchDone } from '@/pages/operator/BatchDone'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage />, errorElement: <RouteError /> },
  {
    element: <PublicOnlyRoute />,
    errorElement: <RouteError />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        // Modo operador: fluxo guiado para o chão de fábrica, sem menu lateral
        path: '/operador',
        element: <OperatorLayout />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <OperatorHome /> },
          { path: 'lote/novo/:step', element: <NewBatch /> },
          { path: 'lote/novo', element: <Navigate to="/operador/lote/novo/maquina" replace /> },
          { path: 'lote/:id', element: <BatchRun /> },
          { path: 'lote/:id/medicao', element: <MeasurementPage /> },
          { path: 'lote/:id/medicao/:mid', element: <MeasurementPage /> },
          { path: 'lote/:id/encerrar/:step', element: <FinishBatch /> },
          { path: 'lote/:id/concluido', element: <BatchDone /> },
        ],
      },
      {
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          {
            // Erro numa página aparece dentro do layout (menu continua acessível)
            errorElement: <RouteError />,
            children: [
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/sets', element: <SetsPage /> },
              { path: '/sets/:id', element: <SetDetailPage /> },
              { path: '/products', element: <ProductsPage /> },
              { path: '/dimensioning', element: <DimensioningPage /> },
              { path: '/occurrences', element: <OccurrencesPage /> },
              { path: '/lifecycle', element: <LifecyclePage /> },
              { path: '/reports', element: <ReportsPage /> },
              { path: '/companies', element: <CompaniesPage /> },
              { path: '/my-company', element: <MyCompanyPage /> },
              { path: '/machines', element: <MachinesPage /> },
              { path: '/production', element: <ProductionPage /> },
              { path: '/production/new', element: <BatchFormPage /> },
              { path: '/production/:id', element: <BatchFormPage /> },
              { path: '/users', element: <UsersPage /> },
              { path: '/audit', element: <AuditPage /> },
              { path: '*', element: <Navigate to="/dashboard" replace /> },
            ],
          },
        ],
      },
    ],
  },
])
