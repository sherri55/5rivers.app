import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, jobImagesApi, type ImageMeta } from '@/api/endpoints';
import type { PaginationParams, CreateJobInput, UpdateJobInput } from '@/types';

export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...jobKeys.lists(), params] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
  images: (jobId: string) => [...jobKeys.all, jobId, 'images'] as const,
};

export function useJobs(params?: PaginationParams) {
  return useQuery({
    queryKey: jobKeys.list(params),
    queryFn: () => jobsApi.list(params),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobInput) => jobsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobInput }) =>
      jobsApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: jobKeys.lists() });
      qc.invalidateQueries({ queryKey: jobKeys.detail(variables.id) });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}

// --- Job Images ---

export function useJobImages(jobId: string) {
  return useQuery<ImageMeta[]>({
    queryKey: jobKeys.images(jobId),
    queryFn: () => jobImagesApi.list(jobId),
    enabled: !!jobId,
  });
}

export function useUploadJobImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, file }: { jobId: string; file: File }) =>
      jobImagesApi.upload(jobId, file),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.images(vars.jobId) });
    },
  });
}

export function useDeleteJobImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, imageId }: { jobId: string; imageId: string }) =>
      jobImagesApi.delete(jobId, imageId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.images(vars.jobId) });
    },
  });
}
