import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dispatchersApi } from '@/api/endpoints';
import type { PaginationParams, Dispatcher } from '@/types';

export const dispatcherKeys = {
  all: ['dispatchers'] as const,
  lists: () => [...dispatcherKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...dispatcherKeys.lists(), params] as const,
  details: () => [...dispatcherKeys.all, 'detail'] as const,
  detail: (id: string) => [...dispatcherKeys.details(), id] as const,
};

export function useDispatchersList(params?: PaginationParams) {
  return useQuery({
    queryKey: dispatcherKeys.list(params),
    queryFn: () => dispatchersApi.list(params),
  });
}

export function useDispatcher(id: string) {
  return useQuery({
    queryKey: dispatcherKeys.detail(id),
    queryFn: () => dispatchersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateDispatcher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Dispatcher>) => dispatchersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dispatcherKeys.lists() });
      qc.invalidateQueries({ queryKey: ['dispatchers', 'lookup'] });
    },
  });
}

export function useUpdateDispatcher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Dispatcher> }) =>
      dispatchersApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: dispatcherKeys.lists() });
      qc.invalidateQueries({ queryKey: dispatcherKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: ['dispatchers', 'lookup'] });
    },
  });
}

export function useDeleteDispatcher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dispatchersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dispatcherKeys.lists() });
      qc.invalidateQueries({ queryKey: ['dispatchers', 'lookup'] });
    },
  });
}
