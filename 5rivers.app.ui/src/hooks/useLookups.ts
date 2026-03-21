import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  companiesApi,
  jobTypesApi,
  driversApi,
  dispatchersApi,
  unitsApi,
  carriersApi,
} from '@/api/endpoints';

// ============================================
// Lookup hooks — fetch reference data and
// build id→name maps for display resolution.
// These are cached aggressively since reference
// data changes infrequently.
// ============================================

const LOOKUP_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useCompanies() {
  return useQuery({
    queryKey: ['companies', 'lookup'],
    queryFn: () => companiesApi.list({ limit: 200 }),
    staleTime: LOOKUP_STALE_TIME,
  });
}

export function useJobTypes(companyId?: string) {
  return useQuery({
    queryKey: ['jobTypes', 'lookup', companyId],
    queryFn: () => jobTypesApi.list({ limit: 200, companyId: companyId || undefined }),
    staleTime: LOOKUP_STALE_TIME,
  });
}

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers', 'lookup'],
    queryFn: () => driversApi.list({ limit: 200 }),
    staleTime: LOOKUP_STALE_TIME,
  });
}

export function useDispatchers() {
  return useQuery({
    queryKey: ['dispatchers', 'lookup'],
    queryFn: () => dispatchersApi.list({ limit: 200 }),
    staleTime: LOOKUP_STALE_TIME,
  });
}

export function useUnits() {
  return useQuery({
    queryKey: ['units', 'lookup'],
    queryFn: () => unitsApi.list({ limit: 200 }),
    staleTime: LOOKUP_STALE_TIME,
  });
}

export function useCarriers() {
  return useQuery({
    queryKey: ['carriers', 'lookup'],
    queryFn: () => carriersApi.list({ limit: 200 }),
    staleTime: LOOKUP_STALE_TIME,
  });
}

/**
 * Returns id→name maps for all lookup entities.
 * Used by list pages to resolve IDs to display names.
 */
export function useLookupMaps() {
  const companies = useCompanies();
  const drivers = useDrivers();
  const dispatchers = useDispatchers();
  const units = useUnits();

  const companyMap = useMemo(
    () => new Map(companies.data?.data.map((c) => [c.id, c.name]) ?? []),
    [companies.data],
  );

  const driverMap = useMemo(
    () => new Map(drivers.data?.data.map((d) => [d.id, d.name]) ?? []),
    [drivers.data],
  );

  const dispatcherMap = useMemo(
    () => new Map(dispatchers.data?.data.map((d) => [d.id, d.name]) ?? []),
    [dispatchers.data],
  );

  const unitMap = useMemo(
    () =>
      new Map(
        units.data?.data.map((u) => [u.id, u.plateNumber ? `${u.name} (${u.plateNumber})` : u.name]) ?? [],
      ),
    [units.data],
  );

  const isLoading =
    companies.isLoading || drivers.isLoading || dispatchers.isLoading || units.isLoading;

  return { companyMap, driverMap, dispatcherMap, unitMap, isLoading };
}
