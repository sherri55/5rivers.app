import type { Job } from './types'

/** If job is PENDING but has an invoice, display as RAISED */
export function getEffectiveInvoiceStatus(job: Job): string {
  if (job.invoiceStatus === 'PENDING' && job.invoice?.id) {
    return 'RAISED'
  }
  return job.invoiceStatus
}
