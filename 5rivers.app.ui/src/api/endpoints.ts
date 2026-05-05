// ============================================
// API Endpoints — typed wrappers for each
// backend resource. Used by TanStack Query hooks.
// ============================================

import { api } from './client';
import type {
  ListResult,
  PaginationParams,
  LoginResponse,
  Company,
  JobType,
  Driver,
  Dispatcher,
  Unit,
  Carrier,
  Job,
  CreateJobInput,
  UpdateJobInput,
  Invoice,
  DriverPaySummary,
  DriverPayment,
  JobInvoiceLine,
  ExpenseCategory,
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@/types';

// --- Helpers ---

function buildQuery(params?: PaginationParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// --- Auth ---

export const authApi = {
  login: (email: string, password: string, organizationSlug: string) =>
    api.post<LoginResponse>('/auth/login', { email, password, organizationSlug }),
};

// --- Companies ---

export const companiesApi = {
  list: (params?: PaginationParams) =>
    api.get<ListResult<Company>>(`/companies${buildQuery(params)}`),
  get: (id: string) => api.get<Company>(`/companies/${id}`),
  create: (data: Partial<Company>) => api.post<Company>('/companies', data),
  update: (id: string, data: Partial<Company>) => api.patch<Company>(`/companies/${id}`, data),
  delete: (id: string) => api.delete(`/companies/${id}`),
};

// --- Job Types ---

export const jobTypesApi = {
  list: (params?: PaginationParams & { companyId?: string }) =>
    api.get<ListResult<JobType>>(`/job-types${buildQuery(params)}`),
  get: (id: string) => api.get<JobType>(`/job-types/${id}`),
  create: (data: Partial<JobType>) => api.post<JobType>('/job-types', data),
  update: (id: string, data: Partial<JobType>) => api.patch<JobType>(`/job-types/${id}`, data),
  delete: (id: string) => api.delete(`/job-types/${id}`),
};

// --- Drivers ---

export const driversApi = {
  list: (params?: PaginationParams) =>
    api.get<ListResult<Driver>>(`/drivers${buildQuery(params)}`),
  get: (id: string) => api.get<Driver>(`/drivers/${id}`),
  create: (data: Partial<Driver>) => api.post<Driver>('/drivers', data),
  update: (id: string, data: Partial<Driver>) => api.patch<Driver>(`/drivers/${id}`, data),
  delete: (id: string) => api.delete(`/drivers/${id}`),
};

// --- Dispatchers ---

export const dispatchersApi = {
  list: (params?: PaginationParams) =>
    api.get<ListResult<Dispatcher>>(`/dispatchers${buildQuery(params)}`),
  get: (id: string) => api.get<Dispatcher>(`/dispatchers/${id}`),
  create: (data: Partial<Dispatcher>) => api.post<Dispatcher>('/dispatchers', data),
  update: (id: string, data: Partial<Dispatcher>) =>
    api.patch<Dispatcher>(`/dispatchers/${id}`, data),
  delete: (id: string) => api.delete(`/dispatchers/${id}`),
};

// --- Units ---

export const unitsApi = {
  list: (params?: PaginationParams) =>
    api.get<ListResult<Unit>>(`/units${buildQuery(params)}`),
  get: (id: string) => api.get<Unit>(`/units/${id}`),
  create: (data: Partial<Unit>) => api.post<Unit>('/units', data),
  update: (id: string, data: Partial<Unit>) => api.patch<Unit>(`/units/${id}`, data),
  delete: (id: string) => api.delete(`/units/${id}`),
};

// --- Carriers ---

export const carriersApi = {
  list: (params?: PaginationParams) =>
    api.get<ListResult<Carrier>>(`/carriers${buildQuery(params)}`),
  get: (id: string) => api.get<Carrier>(`/carriers/${id}`),
  create: (data: Partial<Carrier>) => api.post<Carrier>('/carriers', data),
  update: (id: string, data: Partial<Carrier>) => api.patch<Carrier>(`/carriers/${id}`, data),
  delete: (id: string) => api.delete(`/carriers/${id}`),
};

// --- Jobs ---

export const jobsApi = {
  list: (params?: PaginationParams) =>
    api.get<ListResult<Job>>(`/jobs${buildQuery(params)}`),
  get: (id: string) => api.get<Job>(`/jobs/${id}`),
  create: (data: CreateJobInput) => api.post<Job>('/jobs', data),
  update: (id: string, data: UpdateJobInput) => api.patch<Job>(`/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
};

// --- Job Images ---

export interface ImageMeta {
  id: string;
  jobId: string;
  contentType: string;
  fileName: string | null;
  createdAt: string;
}

export const jobImagesApi = {
  list: (jobId: string) => api.get<ImageMeta[]>(`/jobs/${jobId}/images`),
  upload: (jobId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<ImageMeta>(`/jobs/${jobId}/images`, formData);
  },
  getUrl: (jobId: string, imageId: string) =>
    `${import.meta.env.VITE_API_URL || '/api'}/jobs/${jobId}/images/${imageId}`,
  delete: (jobId: string, imageId: string) =>
    api.delete(`/jobs/${jobId}/images/${imageId}`),
};

// --- Invoices ---

export const invoicesApi = {
  list: (params?: PaginationParams) =>
    api.get<ListResult<Invoice>>(`/invoices${buildQuery(params)}`),
  get: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  nextNumber: () => api.get<{ nextNumber: string }>('/invoices/next-number'),
  create: (data: Partial<Invoice>) => api.post<Invoice>('/invoices', data),
  update: (id: string, data: Partial<Invoice>) => api.patch<Invoice>(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
};

// --- Driver Pay ---

export const driverPayApi = {
  summary: () =>
    api.get<{ drivers: DriverPaySummary[] }>('/driver-pay'),
  markJobsPaid: (data: {
    driverId: string;
    jobIds: string[];
    amount: number;
    paidAt: string;
    paymentMethod?: string;
    reference?: string | null;
    notes?: string | null;
  }) => api.post<{ paymentId: string; markedCount: number }>('/driver-pay/mark-jobs-paid', data),
};

// --- Driver Payments CRUD ---

export const driverPaymentsApi = {
  list: (params?: PaginationParams & { driverId?: string }) => {
    const query = buildQuery(params);
    const driverParam = params?.driverId ? `${query ? '&' : '?'}driverId=${params.driverId}` : '';
    return api.get<ListResult<DriverPayment>>(`/driver-payments${query}${driverParam}`);
  },
  get: (id: string) => api.get<DriverPayment>(`/driver-payments/${id}`),
  create: (data: Partial<DriverPayment>) => api.post<DriverPayment>('/driver-payments', data),
  update: (id: string, data: Partial<DriverPayment>) =>
    api.patch<DriverPayment>(`/driver-payments/${id}`, data),
  delete: (id: string) => api.delete(`/driver-payments/${id}`),
};

// --- PDF Downloads ---

/** Download a file from the API as a blob and trigger browser download. */
async function downloadFile(path: string, fallbackFilename: string) {
  const token = localStorage.getItem('token');
  const base = import.meta.env.VITE_API_URL || '/api';
  const res = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try { const body = await res.json(); msg = body.error || body.message || msg; } catch {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Append an optional columns array to an already-built query string. */
function withColumns(qs: string, columns?: string[]): string {
  if (!columns?.length) return qs;
  const sep = qs.includes('?') ? '&' : '?';
  return `${qs}${sep}columns=${columns.join(',')}`;
}

export const pdfApi = {
  downloadInvoice: (invoiceId: string) =>
    downloadFile(`/invoices/${invoiceId}/pdf`, 'invoice.pdf'),
  exportJobs: (params?: PaginationParams, columns?: string[]) =>
    downloadFile(withColumns(`/export/jobs${buildQuery(params)}`, columns), 'jobs-report.pdf'),
  exportInvoices: (params?: PaginationParams, columns?: string[]) =>
    downloadFile(withColumns(`/export/invoices${buildQuery(params)}`, columns), 'invoices-report.pdf'),
  exportDrivers: (params?: PaginationParams, columns?: string[]) =>
    downloadFile(withColumns(`/export/drivers${buildQuery(params)}`, columns), 'drivers-report.pdf'),
  exportDispatchers: (params?: PaginationParams, columns?: string[]) =>
    downloadFile(withColumns(`/export/dispatchers${buildQuery(params)}`, columns), 'dispatchers-report.pdf'),
  exportCompanies: (params?: PaginationParams, columns?: string[]) =>
    downloadFile(withColumns(`/export/companies${buildQuery(params)}`, columns), 'companies-report.pdf'),
  exportUnits: (params?: PaginationParams, columns?: string[]) =>
    downloadFile(withColumns(`/export/units${buildQuery(params)}`, columns), 'units-report.pdf'),
  exportCarriers: (params?: PaginationParams, columns?: string[]) =>
    downloadFile(withColumns(`/export/carriers${buildQuery(params)}`, columns), 'carriers-report.pdf'),
};

// --- Expense Categories ---

export const expenseCategoriesApi = {
  list: (params?: PaginationParams) =>
    api.get<ListResult<ExpenseCategory>>(`/expense-categories${buildQuery(params)}`),
  get: (id: string) => api.get<ExpenseCategory>(`/expense-categories/${id}`),
  create: (data: Partial<ExpenseCategory>) => api.post<ExpenseCategory>('/expense-categories', data),
  update: (id: string, data: Partial<ExpenseCategory>) => api.patch<ExpenseCategory>(`/expense-categories/${id}`, data),
  delete: (id: string) => api.delete(`/expense-categories/${id}`),
};

// --- Expenses ---

export const expensesApi = {
  list: (params?: PaginationParams) =>
    api.get<ListResult<Expense>>(`/expenses${buildQuery(params)}`),
  get: (id: string) => api.get<Expense>(`/expenses/${id}`),
  create: (data: CreateExpenseInput) => api.post<Expense>('/expenses', data),
  update: (id: string, data: UpdateExpenseInput) => api.patch<Expense>(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

// --- Analytics ---

export interface DashboardStats {
  revenue: { total: number; thisMonth: number; lastMonth: number; thisWeek: number; today: number };
  jobs: { total: number; thisMonth: number; lastMonth: number; thisWeek: number; today: number; unpaidCount: number; paidCount: number };
  invoices: { total: number; totalOutstanding: number; createdCount: number; raisedCount: number; receivedCount: number };
  drivers: { totalBalance: number; activeCount: number };
  units: { total: number; activeCount: number; maintenanceCount: number; inactiveCount: number };
  dateRange: { minDate: string | null; maxDate: string | null };
  expenses: { total: number; thisMonth: number; lastMonth: number; thisWeek: number; today: number; count: number };
  profit: { total: number; thisMonth: number; lastMonth: number };
}

export interface DailyRevenue { date: string; revenue: number; jobs: number }
export interface MonthlyRevenue { month: string; revenue: number; jobs: number }
export interface CompanyRevenue { companyId: string; companyName: string; revenue: number; jobs: number }
export interface DriverRevenue { driverId: string; driverName: string; revenue: number; jobs: number; paid: number; unpaid: number }
export interface DispatcherRevenue { dispatcherId: string; dispatcherName: string; revenue: number; jobs: number; commission: number }
export interface SourceTypeBreakdown { sourceType: string; count: number; revenue: number }
export interface PaymentStatus { status: string; count: number; amount: number }
export interface JobTypeRevenue { jobTypeId: string; jobTypeTitle: string; companyName: string; dispatchType: string; revenue: number; jobs: number }
export interface ExpenseByCategoryItem { categoryId: string | null; categoryName: string; categoryColor: string | null; total: number; count: number }
export interface MonthlyExpense { month: string; expenses: number; count: number }
export interface MonthlyProfit { month: string; revenue: number; expenses: number; profit: number; jobs: number }

export const analyticsApi = {
  dashboard: () => api.get<DashboardStats>('/analytics/dashboard'),
  revenueDaily: (days?: number) => api.get<DailyRevenue[]>(`/analytics/revenue/daily${days ? `?days=${days}` : ''}`),
  revenueMonthly: (months?: number) => api.get<MonthlyRevenue[]>(`/analytics/revenue/monthly${months ? `?months=${months}` : ''}`),
  revenueByCompany: (startDate?: string, endDate?: string) => {
    const p = new URLSearchParams();
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    const q = p.toString();
    return api.get<CompanyRevenue[]>(`/analytics/revenue/by-company${q ? `?${q}` : ''}`);
  },
  revenueByDriver: (startDate?: string, endDate?: string) => {
    const p = new URLSearchParams();
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    const q = p.toString();
    return api.get<DriverRevenue[]>(`/analytics/revenue/by-driver${q ? `?${q}` : ''}`);
  },
  revenueByDispatcher: (startDate?: string, endDate?: string) => {
    const p = new URLSearchParams();
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    const q = p.toString();
    return api.get<DispatcherRevenue[]>(`/analytics/revenue/by-dispatcher${q ? `?${q}` : ''}`);
  },
  sourceBreakdown: (startDate?: string, endDate?: string) => {
    const p = new URLSearchParams();
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    const q = p.toString();
    return api.get<SourceTypeBreakdown[]>(`/analytics/source-breakdown${q ? `?${q}` : ''}`);
  },
  paymentStatus: (startDate?: string, endDate?: string) => {
    const p = new URLSearchParams();
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    const q = p.toString();
    return api.get<PaymentStatus[]>(`/analytics/payment-status${q ? `?${q}` : ''}`);
  },
  topJobTypes: (startDate?: string, endDate?: string, limit?: number) => {
    const p = new URLSearchParams();
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    if (limit) p.set('limit', String(limit));
    const q = p.toString();
    return api.get<JobTypeRevenue[]>(`/analytics/top-job-types${q ? `?${q}` : ''}`);
  },
  expensesByCategory: (startDate?: string, endDate?: string) => {
    const p = new URLSearchParams();
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    const q = p.toString();
    return api.get<ExpenseByCategoryItem[]>(`/analytics/expenses/by-category${q ? `?${q}` : ''}`);
  },
  monthlyExpenses: (months?: number) => api.get<MonthlyExpense[]>(`/analytics/expenses/monthly${months ? `?months=${months}` : ''}`),
  monthlyProfit: (months?: number) => api.get<MonthlyProfit[]>(`/analytics/profit/monthly${months ? `?months=${months}` : ''}`),
};

// --- Invoice Jobs ---

export const invoiceJobsApi = {
  list: (invoiceId: string) => api.get<JobInvoiceLine[]>(`/invoices/${invoiceId}/jobs`),
  add: (invoiceId: string, data: { jobId: string; amount: number }) =>
    api.post<JobInvoiceLine>(`/invoices/${invoiceId}/jobs`, data),
  remove: (invoiceId: string, jobId: string) =>
    api.delete(`/invoices/${invoiceId}/jobs/${jobId}`),
};
