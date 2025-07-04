/* eslint-disable @typescript-eslint/no-explicit-any */
import { Company, Unit, Driver, Dispatcher } from "@/src/types/entities";
// Centralized API utilities for all entities
// NOTE: If you change NEXT_PUBLIC_API_URL in .env.local, you must restart the Next.js dev/build server for changes to take effect.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9999";

// Generic API request handlers
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

async function fetchData(endpoint: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_URL}/${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error(`Failed to fetch from ${endpoint}`);
  return res.json();
}

async function deleteData(endpoint: string, id: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_URL}/${endpoint}/${id}`, { 
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error(`Failed to delete from ${endpoint}`);
  return res.json();
}

async function createData<T>(endpoint: string, data: T) {
  const res = await fetch(`${API_URL}/${endpoint}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create in ${endpoint}`);
  return res.json();
}

async function updateData<T>(endpoint: string, id: string, data: T) {
  const res = await fetch(`${API_URL}/${endpoint}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update in ${endpoint}`);
  return res.json();
}

// Companies API
export const companyApi = {
  fetchAll: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.search) query.append("search", params.search);

    const url = params ? `companies?${query.toString()}` : "companies";
    return fetchData(url);
  },
  getById: (id: string) => fetchData(`companies/${id}`),
  create: (data: Omit<Company, "companyId">) => createData("companies", data),
  update: (id: string, data: Omit<Company, "companyId">) =>
    updateData("companies", id, data),
  delete: (id: string) => deleteData("companies", id),
};

// Dispatchers API
export const dispatcherApi = {
  fetchAll: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.search) query.append("search", params.search);

    const url = params ? `dispatchers?${query.toString()}` : "dispatchers";
    return fetchData(url);
  },
  getById: (id: string) => fetchData(`dispatchers/${id}`),
  create: (data: Omit<Dispatcher, "dispatcherId">) =>
    createData("dispatchers", data),
  update: (id: string, data: Omit<Dispatcher, "dispatcherId">) =>
    updateData("dispatchers", id, data),
  delete: (id: string) => deleteData("dispatchers", id),
};

// Drivers API
export const driverApi = {
  fetchAll: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.search) query.append("search", params.search);

    const url = params ? `drivers?${query.toString()}` : "drivers";
    return fetchData(url);
  },
  getById: (id: string) => fetchData(`drivers/${id}`),
  create: (data: Omit<Driver, "driverId">) => createData("drivers", data),
  update: (id: string, data: Omit<Driver, "driverId">) =>
    updateData("drivers", id, data),
  delete: (id: string) => deleteData("drivers", id),
};

// Units API
export const unitApi = {
  fetchAll: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.search) query.append("search", params.search);
    
    const url = params ? `units?${query.toString()}` : "units";
    return fetchData(url);
  },
  getById: (id: string) => fetchData(`units/${id}`),
  create: (data: Omit<Unit, "unitId">) => createData("units", data),
  update: (id: string, data: Omit<Unit, "unitId">) =>
    updateData("units", id, data),
  delete: (id: string) => deleteData("units", id),
};

// JobTypes API
export const jobTypeApi = {
  fetchAll: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    companyId?: string;
    dispatchType?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.search) query.append("search", params.search);
    if (params?.companyId) query.append("companyId", params.companyId);
    if (params?.dispatchType) query.append("dispatchType", params.dispatchType);
    
    const url = params ? `jobtypes?${query.toString()}` : "jobtypes";
    return fetchData(url);
  },
  getById: (id: string) => fetchData(`jobtypes/${id}`),
  create: (data: any) => createData("jobtypes", data),
  update: (id: string, data: any) => updateData("jobtypes", id, data),
  delete: (id: string) => deleteData("jobtypes", id),
};

// Jobs API
export const jobApi = {
  fetchAll: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    dispatcherId?: string;
    unitId?: string;
    driverId?: string;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.search) query.append("search", params.search);
    if (params?.dispatcherId) query.append("dispatcherId", params.dispatcherId);
    if (params?.unitId) query.append("unitId", params.unitId);
    if (params?.driverId) query.append("driverId", params.driverId);
    if (params?.status) query.append("status", params.status);
    
    const url = params ? `jobs?${query.toString()}` : "jobs";
    return fetchData(url);
  },
  getById: (id: string) => fetchData(`jobs/${id}`),
  create: (data: any, isFormData = false) => {
    if (isFormData) {
      return fetch(`${API_URL}/jobs`, {
        method: "POST",
        body: data,
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to create job");
        return res.json();
      });
    } else {
      return createData("jobs", data);
    }
  },
  update: (id: string, data: any, isFormData = false) => {
    debugger;
    if (isFormData) {
      return fetch(`${API_URL}/jobs/${id}`, {
        method: "PUT",
        body: data,
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to update job");
        return res.json();
      });
    } else {
      return updateData("jobs", id, data);
    }
  },
  delete: (id: string) => deleteData("jobs", id),
  togglePaymentReceived: async (id: string) => {
    const res = await fetch(`${API_URL}/jobs/${id}/toggle-payment`, {
      method: "PUT",
    });
    if (!res.ok) throw new Error("Failed to toggle paymentReceived");
    return res.json();
  },
  toggleDriverPaid: async (id: string) => {
    const res = await fetch(`${API_URL}/jobs/${id}/toggle-driver-paid`, {
      method: "PUT",
    });
    if (!res.ok) throw new Error("Failed to toggle driverPaid");
    return res.json();
  },
};

// JobTicket API
export const jobTicketApi = {
  fetchByJob: (jobId: string) => fetchData(`jobs/${jobId}/tickets`),
  create: (jobId: string, data: any) =>
    createData(`jobs/${jobId}/tickets`, data),
  update: (jobId: string, ticketId: string, data: any) =>
    updateData(`jobs/${jobId}/tickets`, ticketId, data),
  delete: (jobId: string, ticketId: string) =>
    deleteData(`jobs/${jobId}/tickets`, ticketId),
};

// Invoices API
export const invoiceApi = {
  fetchAll: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    dispatcherId?: string;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.pageSize) query.append("pageSize", String(params.pageSize));
    if (params?.search) query.append("search", params.search);
    if (params?.dispatcherId) query.append("dispatcherId", params.dispatcherId);
    if (params?.status) query.append("status", params.status);

    const url = params ? `invoices?${query.toString()}` : "invoices";
    return fetchData(url);
  },
  getById: (id: string) => fetchData(`invoices/${id}`),
  create: (data: any) => createData("invoices", data),
  update: (id: string, data: any) => updateData("invoices", id, data),
  delete: (id: string) => deleteData("invoices", id),
  /**
   * Fetches the PDF for an invoice as a Blob.
   * @param invoiceId The ID of the invoice
   * @returns Promise<Blob>
   */
  fetchPdf: async (invoiceId: string): Promise<Blob> => {
    const res = await fetch(`${API_URL}/invoices/${invoiceId}/pdf`, {
      method: "GET",
    });
    if (!res.ok) throw new Error("Failed to fetch invoice PDF");
    return res.blob();
  },
  /**
   * Fetch jobs for an invoice with pagination, grouping, and filtering
   * @param invoiceId string
   * @param params { page?: number, pageSize?: number, dispatcherId?: string, month?: number, year?: number }
   */
  fetchJobs: async (
    invoiceId: string,
    params: {
      page?: number;
      pageSize?: number;
      dispatcherId?: string;
      month?: number;
      year?: number;
    } = {}
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.pageSize) query.append("pageSize", String(params.pageSize));
    if (params.dispatcherId) query.append("dispatcherId", params.dispatcherId);
    if (params.month) query.append("month", String(params.month));
    if (params.year) query.append("year", String(params.year));
    const res = await fetch(
      `${API_URL}/invoices/${invoiceId}/jobs?${query.toString()}`
    );
    if (!res.ok) throw new Error("Failed to fetch invoice jobs");
    return res.json();
  },
};

/**
 * Downloads the PDF for an invoice and triggers a file download in the browser.
 * @param invoiceId The ID of the invoice
 * @param invoiceNumber The invoice number (for filename)
 */
export async function downloadInvoicePdf(
  invoiceId: string,
  invoiceNumber?: string
) {
  try {
    const response = await fetch(`${API_URL}/invoices/${invoiceId}/pdf`, {
      method: "GET",
    });
    if (!response.ok) throw new Error("Failed to download PDF");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = invoiceNumber ? `${invoiceNumber}.pdf` : `${invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    alert("Could not download PDF.");
  }
}

// Invoice Line Items API
export const invoiceLineApi = {
  fetchByInvoice: (invoiceId: string) =>
    fetchData(`invoices/${invoiceId}/lines`),
  create: (invoiceId: string, data: any) =>
    createData(`invoices/${invoiceId}/lines`, data),
  update: (invoiceId: string, lineId: string, data: any) =>
    updateData(`invoices/${invoiceId}/lines`, lineId, data),
  delete: (invoiceId: string, lineId: string) =>
    deleteData(`invoices/${invoiceId}/lines`, lineId),
};

/**
 * Auth API
 */
export async function loginUser(
  loginId: string,
  password: string
): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginId, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  const { token } = await res.json();
  
  // Store token in localStorage for client-side access
  localStorage.setItem("token", token);
  
  // Set httpOnly cookie for middleware authentication
  document.cookie = `authToken=${token}; path=/; secure; samesite=strict`;
  
  return token;
}

export async function logoutUser(): Promise<void> {
  // Clear localStorage
  localStorage.removeItem("token");
  
  // Clear httpOnly cookie
  document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; secure; samesite=strict';
}

// Driver Rates API
export const driverRateApi = {
  fetchByDriver: (driverId: string) => fetchData(`drivers/${driverId}/rates`),
  fetchByJobType: (jobTypeId: string) => fetchData(`jobtypes/${jobTypeId}/rates`),
  create: (data: any) => createData("driverrates", data),
  update: (id: string, data: any) => updateData("driverrates", id, data),
  delete: (id: string) => deleteData("driverrates", id),
};
