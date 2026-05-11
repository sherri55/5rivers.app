/**
 * factories.ts — fast builders for test entities.
 *
 * Each builder accepts an `orgId` and returns the created row. Overrides
 * are merged on top of sensible defaults so most tests stay one line:
 *
 *   const company = await createCompany(orgId);
 *   const jt = await createJobType(orgId, company.id, { rateOfJob: 110, dispatchType: 'hourly' });
 *   const job = await createJob(orgId, jt.id, { startTime: '2026-04-20T12:00:00Z', endTime: '2026-04-20T21:30:00Z' });
 *
 * Every factory uses the production service code under the hood — never
 * raw SQL — so the test exercises the same insert path as live traffic.
 */

import * as companyService from '../../services/company.service';
import * as jobTypeService from '../../services/jobType.service';
import * as jobService from '../../services/job.service';
import * as driverService from '../../services/driver.service';
import * as dispatcherService from '../../services/dispatcher.service';
import * as invoiceService from '../../services/invoice.service';
import * as jobInvoiceService from '../../services/jobInvoice.service';

// ─── Counter for deterministic-but-unique names ─────────────────────────────

let _counter = 0;
const next = () => ++_counter;

// ─── Company ────────────────────────────────────────────────────────────────

export async function createCompany(
  orgId: string,
  overrides: Partial<companyService.CreateCompanyInput> = {},
): Promise<companyService.Company> {
  return companyService.createCompany(orgId, {
    name: `Test Co ${next()}`,
    ...overrides,
  });
}

// ─── JobType ────────────────────────────────────────────────────────────────

export async function createJobType(
  orgId: string,
  companyId: string,
  overrides: Partial<Omit<jobTypeService.CreateJobTypeInput, 'companyId'>> = {},
): Promise<jobTypeService.JobType> {
  return jobTypeService.createJobType(orgId, {
    companyId,
    title: `Route ${next()}`,
    dispatchType: 'hourly',
    rateOfJob: 100,
    ...overrides,
  });
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

export async function createDispatcher(
  orgId: string,
  overrides: Partial<dispatcherService.CreateDispatcherInput> = {},
): Promise<dispatcherService.Dispatcher> {
  return dispatcherService.createDispatcher(orgId, {
    name: `Dispatcher ${next()}`,
    commissionPercent: 10,
    ...overrides,
  });
}

// ─── Driver ─────────────────────────────────────────────────────────────────

export async function createDriver(
  orgId: string,
  overrides: Partial<driverService.CreateDriverInput> = {},
): Promise<driverService.Driver> {
  return driverService.createDriver(orgId, {
    name: `Driver ${next()}`,
    payType: 'PERCENTAGE',
    percentageRate: 25,
    ...overrides,
  });
}

// ─── Job ────────────────────────────────────────────────────────────────────

/**
 * Create a job. Defaults: today's date, no driver/unit, NULL amount
 * (override-only model — read paths derive the amount via vJobsEffective).
 */
export async function createJob(
  orgId: string,
  jobTypeId: string,
  overrides: Partial<Omit<jobService.CreateJobInput, 'jobTypeId'>> = {},
): Promise<jobService.Job> {
  return jobService.createJob(orgId, {
    jobTypeId,
    jobDate: overrides.jobDate ?? new Date().toISOString().slice(0, 10),
    sourceType: 'DISPATCHED',
    ...overrides,
  });
}

// ─── Invoice ────────────────────────────────────────────────────────────────

/**
 * Create an invoice. Either dispatcherId or companyId should be supplied
 * (matches the production routing constraint). Defaults to today.
 */
export async function createInvoice(
  orgId: string,
  target: { dispatcherId?: string | null; companyId?: string | null },
  overrides: Partial<Omit<invoiceService.CreateInvoiceInput, 'dispatcherId' | 'companyId'>> = {},
): Promise<invoiceService.Invoice> {
  return invoiceService.createInvoice(orgId, {
    invoiceDate: new Date().toISOString().slice(0, 10),
    dispatcherId: target.dispatcherId ?? null,
    companyId: target.companyId ?? null,
    ...overrides,
  });
}

// ─── JobInvoice line ────────────────────────────────────────────────────────

/**
 * Add a job to an invoice. Defaults amount to null (inherit from job's
 * effectiveAmount via the vJobInvoiceEffective view). Pass an explicit
 * number for a line-level override.
 */
export async function addJobToInvoice(
  orgId: string,
  invoiceId: string,
  jobId: string,
  amount: number | null = null,
): Promise<jobInvoiceService.JobInvoiceLine> {
  return jobInvoiceService.addJobToInvoice(orgId, invoiceId, jobId, amount);
}
