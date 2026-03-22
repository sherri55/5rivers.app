/**
 * Central index creation at startup. All indexes use IF NOT EXISTS — safe to run
 * repeatedly and will not drop or overwrite existing indexes or data.
 *
 * Database optimizations (from DATABASE_AUDIT):
 * - Invoice.invoiceDate for date-range dashboard/reports
 * - Job.driverPaid for filtered lists
 * - Composite Job (jobDate, invoiceStatus) for common filter pattern
 */
import { neo4jService } from './neo4j';

const INDEXES: string[] = [
  // Company indexes are created by companyService.createIndexes(); not duplicated here.
  // Job
  'CREATE INDEX job_id_index IF NOT EXISTS FOR (j:Job) ON (j.id)',
  'CREATE INDEX job_job_date_index IF NOT EXISTS FOR (j:Job) ON (j.jobDate)',
  'CREATE INDEX job_invoice_status_index IF NOT EXISTS FOR (j:Job) ON (j.invoiceStatus)',
  'CREATE INDEX job_driver_paid_index IF NOT EXISTS FOR (j:Job) ON (j.driverPaid)',
  'CREATE INDEX job_job_date_invoice_status_index IF NOT EXISTS FOR (j:Job) ON (j.jobDate, j.invoiceStatus)',
  // Invoice
  'CREATE INDEX invoice_id_index IF NOT EXISTS FOR (i:Invoice) ON (i.id)',
  'CREATE INDEX invoice_invoice_number_index IF NOT EXISTS FOR (i:Invoice) ON (i.invoiceNumber)',
  'CREATE INDEX invoice_invoice_date_index IF NOT EXISTS FOR (i:Invoice) ON (i.invoiceDate)',
  'CREATE INDEX invoice_status_index IF NOT EXISTS FOR (i:Invoice) ON (i.status)',
  // Driver, Dispatcher, Unit, JobType
  'CREATE INDEX driver_id_index IF NOT EXISTS FOR (d:Driver) ON (d.id)',
  'CREATE INDEX dispatcher_id_index IF NOT EXISTS FOR (d:Dispatcher) ON (d.id)',
  'CREATE INDEX unit_id_index IF NOT EXISTS FOR (u:Unit) ON (u.id)',
  'CREATE INDEX job_type_id_index IF NOT EXISTS FOR (jt:JobType) ON (jt.id)',
  'CREATE INDEX stored_image_id_index IF NOT EXISTS FOR (s:StoredImage) ON (s.id)',
];

export async function ensureIndexes(): Promise<void> {
  for (const query of INDEXES) {
    try {
      await neo4jService.runQuery(query);
    } catch (error: any) {
      // Index may already exist or syntax may vary by Neo4j version
      if (!error?.message?.includes('already exists')) {
        console.warn(`Index creation warning: ${error?.message || error}`);
      }
    }
  }
}
