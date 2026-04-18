import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/landing/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { CompaniesPage } from '@/pages/companies/CompaniesPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { SetsPage } from '@/pages/sets/SetsPage'
import { SetDetailPage } from '@/pages/sets/SetDetailPage'
import { DimensioningPage } from '@/pages/dimensioning/DimensioningPage'
import { OccurrencesPage } from '@/pages/occurrences/OccurrencesPage'
import { LifecyclePage } from '@/pages/lifecycle/LifecyclePage'
import { ReportsPage } from '@/pages/reports/ReportsPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <PublicOnlyRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/sets', element: <SetsPage /> },
          { path: '/sets/:id', element: <SetDetailPage /> },
          { path: '/dimensioning', element: <DimensioningPage /> },
          { path: '/occurrences', element: <OccurrencesPage /> },
          { path: '/lifecycle', element: <LifecyclePage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/companies', element: <CompaniesPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
])
