import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitsApi } from '@/api/endpoints';
import type { PaginationParams, Unit } from '@/types';

export const unitKeys = {
  all: ['units'] as const,
  lists: () => [...unitKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...unitKeys.lists(), params] as const,
  details: () => [...unitKeys.all, 'detail'] as const,
  detail: (id: string) => [...unitKeys.details(), id] as const,
};

export function useUnitsList(params?: PaginationParams) {
  return useQuery({
    queryKey: unitKeys.list(params),
    queryFn: () => unitsApi.list(params),
  });
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: unitKeys.detail(id),
    queryFn: () => unitsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Unit>) => unitsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: unitKeys.lists() });
      qc.invalidateQueries({ queryKey: ['units', 'lookup'] });
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Unit> }) =>
      unitsApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: unitKeys.lists() });
      qc.invalidateQueries({ queryKey: unitKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: ['units', 'lookup'] });
    },
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unitsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: unitKeys.lists() });
      qc.invalidateQueries({ queryKey: ['units', 'lookup'] });
    },
  });
}
