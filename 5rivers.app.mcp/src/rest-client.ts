/**
 * REST client for 5rivers.app backend API.
 * Replaces the old GraphQL client — used by both MCP tools and the agent.
 */

export interface RestClientConfig {
  baseUrl: string;
  authToken?: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, string>;
  search?: string;
}

export interface ListResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function createRestClient(config: RestClientConfig) {
  const { baseUrl, authToken } = config;

  /** Returns a new client instance using a different token — for per-request auth. */
  function withToken(token: string) {
    return createRestClient({ baseUrl, authToken: token });
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(`${baseUrl}${path}`);
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return undefined as T;

    const json = await res.json();
    if (!res.ok) {
      const msg =
        json?.error?.message ||
        json?.error?.code ||
        json?.message ||
        (typeof json?.error === 'string' ? json.error : null) ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json as T;
  }

  function buildListQuery(params?: ListParams): Record<string, string | number | undefined> {
    if (!params) return {};
    const q: Record<string, string | number | undefined> = {};
    if (params.page) q.page = params.page;
    if (params.limit) q.limit = params.limit;
    if (params.sortBy) q.sortBy = params.sortBy;
    if (params.order) q.order = params.order;
    if (params.search) q.filter_search = params.search;
    if (params.filters) {
      for (const [k, v] of Object.entries(params.filters)) {
        q[`filter_${k}`] = v;
      }
    }
    return q;
  }

  // ── CRUD factory ──────────────────────────────────────────
  function crudFor<T>(resource: string) {
    return {
      list: (params?: ListParams) =>
        request<ListResult<T>>('GET', `/${resource}`, undefined, buildListQuery(params)),
      get: (id: string) =>
        request<T>('GET', `/${resource}/${id}`),
      create: (data: Record<string, unknown>) =>
        request<T>('POST', `/${resource}`, data),
      update: (id: string, data: Record<string, unknown>) =>
        request<T>('PATCH', `/${resource}/${id}`, data),
      delete: (id: string) =>
        request<void>('DELETE', `/${resource}/${id}`),
    };
  }

  /**
   * Multipart upload helper. The server's image route is `upload.single('file')`,
   * so the form field name MUST be "file". Uses Node's built-in FormData/Blob
   * (Node 18+).
   */
  async function uploadFile<T>(
    path: string,
    content: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const blob = new Blob([new Uint8Array(content)], { type: mimeType || 'application/octet-stream' });
    const form = new FormData();
    form.append('file', blob, fileName);

    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    // NOTE: do NOT set Content-Type — fetch+FormData sets the proper
    // multipart/form-data; boundary=... header automatically.

    const res = await fetch(url, { method: 'POST', headers, body: form });
    if (res.status === 204) return undefined as T;
    const json = await res.json();
    if (!res.ok) {
      const msg =
        json?.error?.message || json?.error?.code || json?.message ||
        (typeof json?.error === 'string' ? json.error : null) ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json as T;
  }

  const jobs = crudFor<Record<string, unknown>>('jobs');

  /** Job-image attachment helpers — wraps POST/GET/DELETE on /jobs/:id/images. */
  const jobImages = {
    /** Upload an image and attach it to a job. Returns the created Image meta. */
    upload: (jobId: string, content: Buffer, mimeType: string, fileName: string) =>
      uploadFile<{ id: string; jobId: string; contentType: string; fileName: string | null; createdAt: string }>(
        `/jobs/${jobId}/images`, content, mimeType, fileName,
      ),
    list: (jobId: string) =>
      request<unknown[]>('GET', `/jobs/${jobId}/images`),
    delete: (jobId: string, imageId: string) =>
      request<void>('DELETE', `/jobs/${jobId}/images/${imageId}`),
  };
  const jobTypes = crudFor<Record<string, unknown>>('job-types');
  const drivers = crudFor<Record<string, unknown>>('drivers');
  const companies = crudFor<Record<string, unknown>>('companies');
  const dispatchers = crudFor<Record<string, unknown>>('dispatchers');
  const units = crudFor<Record<string, unknown>>('units');
  const carriers = crudFor<Record<string, unknown>>('carriers');
  const invoices = crudFor<Record<string, unknown>>('invoices');
  const expenses = crudFor<Record<string, unknown>>('expenses');
  const expenseCategories = crudFor<Record<string, unknown>>('expense-categories');

  // ── Analytics ─────────────────────────────────────────────
  const analytics = {
    dashboard: () =>
      request<Record<string, unknown>>('GET', '/analytics/dashboard'),
    dailyRevenue: (days?: number) =>
      request<unknown[]>('GET', '/analytics/revenue/daily', undefined, { days }),
    monthlyRevenue: (months?: number) =>
      request<unknown[]>('GET', '/analytics/revenue/monthly', undefined, { months }),
    revenueByCompany: (startDate?: string, endDate?: string) =>
      request<unknown[]>('GET', '/analytics/revenue/by-company', undefined, { startDate, endDate }),
    revenueByDriver: (startDate?: string, endDate?: string) =>
      request<unknown[]>('GET', '/analytics/revenue/by-driver', undefined, { startDate, endDate }),
    expensesByCategory: (startDate?: string, endDate?: string) =>
      request<unknown[]>('GET', '/analytics/expenses/by-category', undefined, { startDate, endDate }),
    monthlyExpenses: (months?: number) =>
      request<unknown[]>('GET', '/analytics/expenses/monthly', undefined, { months }),
    monthlyProfit: (months?: number) =>
      request<unknown[]>('GET', '/analytics/profit/monthly', undefined, { months }),
    topJobTypes: (startDate?: string, endDate?: string, limit?: number) =>
      request<unknown[]>('GET', '/analytics/top-job-types', undefined, { startDate, endDate, limit }),
    paymentStatus: (startDate?: string, endDate?: string) =>
      request<unknown>('GET', '/analytics/payment-status', undefined, { startDate, endDate }),
  };

  // ── Invoice extras ────────────────────────────────────────
  const invoiceExtras = {
    nextNumber: () =>
      request<{ nextNumber: string }>('GET', '/invoices/next-number'),
    getJobs: (invoiceId: string) =>
      request<unknown[]>('GET', `/invoices/${invoiceId}/jobs`),
    addJob: (invoiceId: string, data: Record<string, unknown>) =>
      request<unknown>('POST', `/invoices/${invoiceId}/jobs`, data),
    updateJob: (invoiceId: string, jobId: string, data: Record<string, unknown>) =>
      request<unknown>('PATCH', `/invoices/${invoiceId}/jobs/${jobId}`, data),
    removeJob: (invoiceId: string, jobId: string) =>
      request<void>('DELETE', `/invoices/${invoiceId}/jobs/${jobId}`),
  };

  // ── Driver payments ────────────────────────────────────────
  const driverPayments = crudFor<Record<string, unknown>>('driver-payments');

  // ── Job driver pay ─────────────────────────────────────────
  const jobDriverPay = {
    get: (jobId: string) =>
      request<Record<string, unknown>>('GET', `/jobs/${jobId}/driver-pay`),
    set: (jobId: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>('PUT', `/jobs/${jobId}/driver-pay`, data),
    update: (jobId: string, data: Record<string, unknown>) =>
      request<Record<string, unknown>>('PATCH', `/jobs/${jobId}/driver-pay`, data),
    delete: (jobId: string) =>
      request<void>('DELETE', `/jobs/${jobId}/driver-pay`),
  };

  return {
    jobs,
    jobImages,
    jobTypes,
    drivers,
    companies,
    dispatchers,
    units,
    carriers,
    invoices,
    invoiceExtras,
    driverPayments,
    jobDriverPay,
    expenses,
    expenseCategories,
    analytics,
    withToken,
    login: (email: string, password: string, organizationSlug: string) =>
      request<{ token: string; user: Record<string, unknown> }>('POST', '/auth/login', { email, password, organizationSlug }),
  };
}

export type RestClient = ReturnType<typeof createRestClient>;
