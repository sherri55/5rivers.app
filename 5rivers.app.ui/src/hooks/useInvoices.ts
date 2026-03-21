import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, invoiceJobsApi } from '@/api/endpoints';
import type { PaginationParams, Invoice } from '@/types';

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  jobs: (invoiceId: string) => [...invoiceKeys.all, invoiceId, 'jobs'] as const,
};

export function useInvoicesList(params?: PaginationParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => invoicesApi.list(params),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => invoicesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Invoice>) => invoicesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) =>
      invoicesApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// --- Invoice Jobs ---

export function useInvoiceJobs(invoiceId: string) {
  return useQuery({
    queryKey: invoiceKeys.jobs(invoiceId),
    queryFn: () => invoiceJobsApi.list(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useAddJobToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, jobId, amount }: { invoiceId: string; jobId: string; amount: number }) =>
      invoiceJobsApi.add(invoiceId, { jobId, amount }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.jobs(variables.invoiceId) });
    },
  });
}

export function useRemoveJobFromInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, jobId }: { invoiceId: string; jobId: string }) =>
      invoiceJobsApi.remove(invoiceId, jobId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.jobs(variables.invoiceId) });
    },
  });
}
