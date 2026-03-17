import { useMemo } from 'react';
import {
  addHST,
  getCommission,
  getAmountAfterCommission,
  getDriverPay,
  formatCurrency,
  type JobWithRelations,
} from '@/lib/calculations/jobCalculations';

/**
 * Hook for job-related calculations - use with Job or JobWithRelations
 */
export function useJobCalculations() {
  return useMemo(
    () => ({
      addHST,
      getCommission: (job: JobWithRelations, opts?: { commissionPercent?: number }) =>
        getCommission(job, opts),
      getAmountAfterCommission: (job: JobWithRelations, opts?: { commissionPercent?: number }) =>
        getAmountAfterCommission(job, opts),
      getDriverPay: (job: JobWithRelations, opts?: { commissionPercent?: number }) =>
        getDriverPay(job, opts),
      formatCurrency,
    }),
    []
  );
}
