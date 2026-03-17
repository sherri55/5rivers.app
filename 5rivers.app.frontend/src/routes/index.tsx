import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/Layout'

const DashboardPage = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const CompaniesPage = lazy(() => import('@/pages/Companies').then(m => ({ default: m.Companies })))
const DriversPage = lazy(() => import('@/pages/Drivers').then(m => ({ default: m.Drivers })))
const UnitsPage = lazy(() => import('@/pages/Units').then(m => ({ default: m.Units })))
const FleetPage = lazy(() => import('@/pages/Fleet').then(m => ({ default: m.Fleet })))
const DispatchersPage = lazy(() => import('@/pages/Dispatchers').then(m => ({ default: m.Dispatchers })))
const JobsPage = lazy(() => import('@/features/jobs').then(m => ({ default: m.JobsPage })))
const JobTypesPage = lazy(() => import('@/pages/JobTypes').then(m => ({ default: m.JobTypes })))
const InvoicesPage = lazy(() => import('@/pages/Invoices').then(m => ({ default: m.Invoices })))
const ReportsPage = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Reports })))
const NotFoundPage = lazy(() => import('@/pages/NotFound').then(m => ({ default: m.NotFound })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/dispatchers" element={<DispatchersPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/job-types" element={<JobTypesPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </Suspense>
  )
}
