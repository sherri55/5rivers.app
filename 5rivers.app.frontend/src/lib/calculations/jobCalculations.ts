/**
 * Centralized job/invoice calculation logic - single source of truth
 * Matches backend CalculationService formula: (amount - commission) * 1.13
 */

export const HST_RATE = 0.13; // 13% Ontario HST
export const DEFAULT_COMMISSION_PERCENT = 5;

export interface JobWithRelations {
  calculatedAmount?: number;
  amount?: number;
  driver?: { hourlyRate?: number };
  dispatcher?: { commissionPercent?: number };
}

/**
 * Add HST (13%) to amount
 */
export const addHST = (amount: number): number => amount * (1 + HST_RATE);

/**
 * Get commission amount (on HST-inclusive amount)
 */
export const getCommission = (
  job: JobWithRelations,
  options?: { commissionPercent?: number }
): number => {
  const amount = job.calculatedAmount ?? job.amount ?? 0;
  const commissionPercent =
    options?.commissionPercent ??
    job.dispatcher?.commissionPercent ??
    DEFAULT_COMMISSION_PERCENT;
  return addHST(amount) * (commissionPercent / 100);
};

/**
 * Get amount after commission deduction (HST-inclusive)
 */
export const getAmountAfterCommission = (
  job: JobWithRelations,
  options?: { commissionPercent?: number }
): number => {
  const amount = job.calculatedAmount ?? job.amount ?? 0;
  return addHST(amount) - getCommission(job, options);
};

/**
 * Get driver pay (percentage of amount after commission)
 */
export const getDriverPay = (
  job: JobWithRelations,
  options?: { commissionPercent?: number }
): number => {
  const hourlyRate = job.driver?.hourlyRate ?? 0;
  return getAmountAfterCommission(job, options) * (hourlyRate / 100);
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
