import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '@/api/endpoints';
import type { OrgSettings } from '@/types';

export const orgKeys = {
  me: ['organization', 'me'] as const,
};

export function useOrganization() {
  return useQuery({
    queryKey: orgKeys.me,
    queryFn: () => organizationApi.getMe(),
  });
}

export function useUpdateOrganizationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: OrgSettings) => organizationApi.updateSettings(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.me });
    },
  });
}
