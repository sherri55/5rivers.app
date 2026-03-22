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

export const pdfApi = {
  downloadInvoice: (invoiceId: string) =>
    downloadFile(`/invoices/${invoiceId}/pdf`, 'invoice.pdf'),
  exportJobs: (params?: PaginationParams) =>
    downloadFile(`/export/jobs${buildQuery(params)}`, 'jobs-report.pdf'),
  exportInvoices: (params?: PaginationParams) =>
    downloadFile(`/export/invoices${buildQuery(params)}`, 'invoices-report.pdf'),
  exportDrivers: (params?: PaginationParams) =>
    downloadFile(`/export/drivers${buildQuery(params)}`, 'drivers-report.pdf'),
  exportDispatchers: (params?: PaginationParams) =>
    downloadFile(`/export/dispatchers${buildQuery(params)}`, 'dispatchers-report.pdf'),
  exportCompanies: (params?: PaginationParams) =>
    downloadFile(`/export/companies${buildQuery(params)}`, 'companies-report.pdf'),
  exportUnits: (params?: PaginationParams) =>
    downloadFile(`/export/units${buildQuery(params)}`, 'units-report.pdf'),
  exportCarriers: (params?: PaginationParams) =>
    downloadFile(`/export/carriers${buildQuery(params)}`, 'carriers-report.pdf'),
};

// --- Invoice Jobs ---

export const invoiceJobsApi = {
  list: (invoiceId: string) => api.get<JobInvoiceLine[]>(`/invoices/${invoiceId}/jobs`),
  add: (invoiceId: string, data: { jobId: string; amount: number }) =>
    api.post<JobInvoiceLine>(`/invoices/${invoiceId}/jobs`, data),
  remove: (invoiceId: string, jobId: string) =>
    api.delete(`/invoices/${invoiceId}/jobs/${jobId}`),
};
