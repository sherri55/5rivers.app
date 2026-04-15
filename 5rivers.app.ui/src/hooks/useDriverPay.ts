import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverPayApi, driverPaymentsApi } from '@/api/endpoints';
import type { PaginationParams, DriverPayment } from '@/types';

// ============================================
// Driver Pay hooks — summary + payment CRUD
// ============================================

export const driverPayKeys = {
  all: ['driverPay'] as const,
  summary: () => [...driverPayKeys.all, 'summary'] as const,
  payments: () => [...driverPayKeys.all, 'payments'] as const,
  paymentList: (params?: PaginationParams & { driverId?: string }) =>
    [...driverPayKeys.payments(), params] as const,
};

export function useDriverPaySummary() {
  return useQuery({
    queryKey: driverPayKeys.summary(),
    queryFn: () => driverPayApi.summary(),
  });
}

export function useDriverPayments(driverId?: string) {
  return useQuery({
    queryKey: driverPayKeys.paymentList({ driverId }),
    queryFn: () => driverPaymentsApi.list({ driverId, limit: 200 }),
    enabled: !!driverId,
  });
}

export function useCreateDriverPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DriverPayment>) => driverPaymentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: driverPayKeys.all });
    },
  });
}

export function useDeleteDriverPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => driverPaymentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: driverPayKeys.all });
    },
  });
}

export function useMarkJobsAsPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: driverPayApi.markJobsPaid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: driverPayKeys.all });
    },
  });
}
