import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi } from '@/api/endpoints';
import type { PaginationParams, Driver } from '@/types';

export const driverKeys = {
  all: ['drivers'] as const,
  lists: () => [...driverKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...driverKeys.lists(), params] as const,
  details: () => [...driverKeys.all, 'detail'] as const,
  detail: (id: string) => [...driverKeys.details(), id] as const,
};

export function useDriversList(params?: PaginationParams) {
  return useQuery({
    queryKey: driverKeys.list(params),
    queryFn: () => driversApi.list(params),
  });
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: () => driversApi.get(id),
    enabled: !!id,
  });
}

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Driver>) => driversApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: driverKeys.lists() });
      qc.invalidateQueries({ queryKey: ['drivers', 'lookup'] });
    },
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Driver> }) =>
      driversApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: driverKeys.lists() });
      qc.invalidateQueries({ queryKey: driverKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: ['drivers', 'lookup'] });
    },
  });
}

export function useDeleteDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => driversApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: driverKeys.lists() });
      qc.invalidateQueries({ queryKey: ['drivers', 'lookup'] });
    },
  });
}
