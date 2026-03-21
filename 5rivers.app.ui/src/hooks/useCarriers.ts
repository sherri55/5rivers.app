import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { carriersApi } from '@/api/endpoints';
import type { PaginationParams, Carrier } from '@/types';

export const carrierKeys = {
  all: ['carriers'] as const,
  lists: () => [...carrierKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...carrierKeys.lists(), params] as const,
  details: () => [...carrierKeys.all, 'detail'] as const,
  detail: (id: string) => [...carrierKeys.details(), id] as const,
};

export function useCarriersList(params?: PaginationParams) {
  return useQuery({
    queryKey: carrierKeys.list(params),
    queryFn: () => carriersApi.list(params),
  });
}

export function useCarrier(id: string) {
  return useQuery({
    queryKey: carrierKeys.detail(id),
    queryFn: () => carriersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Carrier>) => carriersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: carrierKeys.lists() });
      qc.invalidateQueries({ queryKey: ['carriers', 'lookup'] });
    },
  });
}

export function useUpdateCarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Carrier> }) =>
      carriersApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: carrierKeys.lists() });
      qc.invalidateQueries({ queryKey: carrierKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: ['carriers', 'lookup'] });
    },
  });
}

export function useDeleteCarrier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => carriersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: carrierKeys.lists() });
      qc.invalidateQueries({ queryKey: ['carriers', 'lookup'] });
    },
  });
}
