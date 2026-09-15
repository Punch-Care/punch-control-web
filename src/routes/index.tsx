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
import { BatchDetailPage } from '@/pages/production/BatchDetailPage'
import { RedirectToBatch } from '@/pages/production/RedirectToBatch'
import { MeasurementPage } from '@/pages/operator/MeasurementPage'
import { FinishBatch } from '@/pages/operator/FinishBatch'
import { BatchDone } from '@/pages/operator/BatchDone'
import { ReportProblem } from '@/pages/operator/ReportProblem'
import { CleaningFlow } from '@/pages/operator/CleaningFlow'
import { MeasureSet } from '@/pages/operator/MeasureSet'

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
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          {
            // Erro numa página aparece dentro do layout (menu continua acessível)
            errorElement: <RouteError />,
            children: [
              {
                // Tarefas do dia: fluxos guiados dentro do mesmo layout (menu, topo e marca iguais)
                path: '/operador',
                element: <OperatorLayout />,
                children: [
                  { index: true, element: <OperatorHome /> },
                  { path: 'lote/novo/:step', element: <NewBatch /> },
                  { path: 'lote/novo', element: <Navigate to="/operador/lote/novo/maquina" replace /> },
                  { path: 'lote/:id', element: <RedirectToBatch /> },
                  { path: 'lote/:id/medicao', element: <MeasurementPage /> },
                  { path: 'lote/:id/medicao/:mid', element: <MeasurementPage /> },
                  { path: 'lote/:id/encerrar/:step', element: <FinishBatch /> },
                  { path: 'lote/:id/concluido', element: <BatchDone /> },
                  { path: 'problema/:step', element: <ReportProblem /> },
                  { path: 'problema', element: <Navigate to="/operador/problema/jogo" replace /> },
                  { path: 'limpeza/:step', element: <CleaningFlow /> },
                  { path: 'limpeza', element: <Navigate to="/operador/limpeza/jogo" replace /> },
                  { path: 'medir/:step', element: <MeasureSet /> },
                  { path: 'medir', element: <Navigate to="/operador/medir/jogo" replace /> },
                ],
              },
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
              { path: '/production/:id', element: <BatchDetailPage /> },
              { path: '/production/:id/editar', element: <BatchFormPage /> },
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
