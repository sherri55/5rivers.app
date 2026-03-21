import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi, jobTypesApi } from '@/api/endpoints';
import type { PaginationParams, Company, JobType } from '@/types';

export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...companyKeys.lists(), params] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
};

export const jobTypeKeys = {
  all: ['jobTypes'] as const,
  lists: () => [...jobTypeKeys.all, 'list'] as const,
  byCompany: (companyId: string) => [...jobTypeKeys.lists(), companyId] as const,
};

export function useCompaniesList(params?: PaginationParams) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: () => companiesApi.list(params),
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companiesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Company>) => companiesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.lists() });
      qc.invalidateQueries({ queryKey: ['companies', 'lookup'] });
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      companiesApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: companyKeys.lists() });
      qc.invalidateQueries({ queryKey: companyKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: ['companies', 'lookup'] });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companiesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companyKeys.lists() });
      qc.invalidateQueries({ queryKey: ['companies', 'lookup'] });
    },
  });
}

// --- Job Types (nested under company) ---

export function useCompanyJobTypes(companyId: string) {
  return useQuery({
    queryKey: jobTypeKeys.byCompany(companyId),
    queryFn: () => jobTypesApi.list({ limit: 200, companyId }),
    enabled: !!companyId,
  });
}

export function useCreateJobType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<JobType>) => jobTypesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobTypeKeys.lists() });
      qc.invalidateQueries({ queryKey: ['jobTypes', 'lookup'] });
    },
  });
}

export function useUpdateJobType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobType> }) =>
      jobTypesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobTypeKeys.lists() });
      qc.invalidateQueries({ queryKey: ['jobTypes', 'lookup'] });
    },
  });
}

export function useDeleteJobType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobTypesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobTypeKeys.lists() });
      qc.invalidateQueries({ queryKey: ['jobTypes', 'lookup'] });
    },
  });
}
