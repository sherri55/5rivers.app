import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import { AuthProvider } from '@/context/auth';
import { ToastProvider } from '@/context/toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ApiError } from '@/api/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { JobsListPage } from '@/pages/jobs/JobsListPage';
import { JobFormPage } from '@/pages/jobs/JobFormPage';
import { DriversListPage } from '@/pages/drivers/DriversListPage';
import { DriverFormPage } from '@/pages/drivers/DriverFormPage';
import { CompaniesListPage } from '@/pages/companies/CompaniesListPage';
import { CompanyFormPage } from '@/pages/companies/CompanyFormPage';
import { DispatchersListPage } from '@/pages/dispatchers/DispatchersListPage';
import { DispatcherFormPage } from '@/pages/dispatchers/DispatcherFormPage';
import { UnitsListPage } from '@/pages/units/UnitsListPage';
import { UnitFormPage } from '@/pages/units/UnitFormPage';
import { CarriersListPage } from '@/pages/carriers/CarriersListPage';
import { CarrierFormPage } from '@/pages/carriers/CarrierFormPage';
import { InvoicesListPage } from '@/pages/invoices/InvoicesListPage';
import { InvoiceFormPage } from '@/pages/invoices/InvoiceFormPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

// ============================================
// App Root — routing, providers, query client
// ============================================

// Global error handler for toast notifications.
// We dispatch a custom event so the ToastProvider can pick it up
// without needing context at QueryClient init time.
function emitApiError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return; // handled by auto-logout
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  window.dispatchEvent(new CustomEvent('api-error', { detail: message }));
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s before considered stale
      retry: (failureCount, error) => {
        // Don't retry on client errors (4xx) or network down
        if (error instanceof ApiError && (error.status === 0 || (error.status >= 400 && error.status < 500))) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => emitApiError(error),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Only show global toast if the mutation doesn't have its own onError
      if (!mutation.options.onError) {
        emitApiError(error);
      }
    },
  }),
});

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Jobs */}
                <Route path="/jobs" element={<JobsListPage />} />
                <Route path="/jobs/new" element={<JobFormPage />} />
                <Route path="/jobs/:id/edit" element={<JobFormPage />} />

                {/* Drivers */}
                <Route path="/drivers" element={<DriversListPage />} />
                <Route path="/drivers/new" element={<DriverFormPage />} />
                <Route path="/drivers/:id/edit" element={<DriverFormPage />} />

                {/* Companies */}
                <Route path="/companies" element={<CompaniesListPage />} />
                <Route path="/companies/new" element={<CompanyFormPage />} />
                <Route path="/companies/:id/edit" element={<CompanyFormPage />} />

                {/* Dispatchers */}
                <Route path="/dispatchers" element={<DispatchersListPage />} />
                <Route path="/dispatchers/new" element={<DispatcherFormPage />} />
                <Route path="/dispatchers/:id/edit" element={<DispatcherFormPage />} />

                {/* Units */}
                <Route path="/units" element={<UnitsListPage />} />
                <Route path="/units/new" element={<UnitFormPage />} />
                <Route path="/units/:id/edit" element={<UnitFormPage />} />

                {/* Carriers */}
                <Route path="/carriers" element={<CarriersListPage />} />
                <Route path="/carriers/new" element={<CarrierFormPage />} />
                <Route path="/carriers/:id/edit" element={<CarrierFormPage />} />

                {/* Invoices */}
                <Route path="/invoices" element={<InvoicesListPage />} />
                <Route path="/invoices/new" element={<InvoiceFormPage />} />
                <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />

                {/* Settings */}
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
