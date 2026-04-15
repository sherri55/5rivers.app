// ============================================
// Domain Types — mirrors backend exactly
// ============================================

// --- Auth ---
export type Role = 'OWNER' | 'ADMIN' | 'DISPATCHER' | 'MEMBER' | 'VIEWER';

export interface AuthUser {
  userId: string;
  email: string;
  organizationId: string;
  role: Role;
  name?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  expiresIn: string;
}

// --- Pagination ---
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  [key: `filter_${string}`]: string | undefined;
}

export interface ListResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --- Organizations ---
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Companies ---
export interface Company {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  size: string | null;
  founded: number | null;
  logo: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Job Types ---
export interface JobType {
  id: string;
  companyId: string;
  title: string;
  startLocation: string | null;
  endLocation: string | null;
  dispatchType: string;
  rateOfJob: number;
  createdAt: string;
  updatedAt: string;
}

// --- Drivers ---
export type DriverPayType = 'HOURLY' | 'PERCENTAGE' | 'CUSTOM';

export interface Driver {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  payType: DriverPayType;
  hourlyRate: number;
  percentageRate: number;
  createdAt: string;
  updatedAt: string;
}

// --- Dispatchers ---
export interface Dispatcher {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  commissionPercent: number;
  createdAt: string;
  updatedAt: string;
}

// --- Units ---
export type UnitStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';

export interface Unit {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string | null;
  plateNumber: string | null;
  vin: string | null;
  status: UnitStatus;
  year: number | null;
  make: string | null;
  model: string | null;
  mileage: number | null;
  insuranceExpiry: string | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Carriers ---
export type CarrierRateType = 'PERCENTAGE' | 'FLAT_PER_JOB' | 'FLAT_PER_LOAD' | 'FLAT_PER_TON' | 'HOURLY';
export type CarrierStatus = 'ACTIVE' | 'INACTIVE';

export interface Carrier {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  rateType: CarrierRateType;
  rate: number;
  status: CarrierStatus;
  createdAt: string;
  updatedAt: string;
}

// --- Jobs ---
export type JobSourceType = 'DISPATCHED' | 'DIRECT';

export interface Job {
  id: string;
  organizationId: string;
  jobDate: string;
  jobTypeId: string;
  driverId: string | null;
  dispatcherId: string | null;
  unitId: string | null;
  carrierId: string | null;
  sourceType: JobSourceType;
  weight: string | null;
  loads: number | null;
  startTime: string | null;
  endTime: string | null;
  amount: number | null;
  carrierAmount: number | null;
  ticketIds: string | null;
  jobPaid: boolean;
  driverPaid: boolean;
  createdAt: string;
  updatedAt: string;
  // Resolved names from server joins
  jobTypeTitle: string | null;
  jobTypeDispatchType: string | null;
  companyId: string | null;
  companyName: string | null;
  driverName: string | null;
  dispatcherName: string | null;
  unitName: string | null;
}

export interface CreateJobInput {
  jobDate: string;
  jobTypeId: string;
  driverId?: string | null;
  dispatcherId?: string | null;
  unitId?: string | null;
  carrierId?: string | null;
  sourceType?: JobSourceType;
  weight?: string | null;
  loads?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  amount?: number | null;
  carrierAmount?: number | null;
  ticketIds?: string | null;
  jobPaid?: boolean;
  driverPaid?: boolean;
}

export type UpdateJobInput = Partial<CreateJobInput>;

// --- Invoices ---
export type InvoiceStatus = 'CREATED' | 'RAISED' | 'RECEIVED';

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: InvoiceStatus;
  dispatcherId: string | null;
  companyId: string | null;
  billedTo: string | null;
  billedEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Job Invoice Lines ---
export interface JobInvoiceLine {
  jobId: string;
  invoiceId: string;
  amount: number;
  addedAt: string;
  // Enriched fields from JOIN (returned by GET /invoices/:id/jobs)
  jobDate?: string;
  jobTypeId?: string;
  driverId?: string | null;
  dispatcherId?: string | null;
  unitId?: string | null;
  sourceType?: string;
  weight?: string | null;
  loads?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  ticketIds?: string | null;
}

// --- Driver Pay Summary ---
export interface DriverPayJobDetail {
  jobId: string;
  jobDate: string;
  jobTypeTitle: string;
  jobAmount: number | null;
  amount: number;
  paidAt: string | null;
  paymentId: string | null;
}

export interface DriverPayPaymentDetail {
  id: string;
  amount: number;
  paidAt: string;
  paymentMethod: string;
  reference: string | null;
}

export interface DriverPaySummary {
  driverId: string;
  driverName: string;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  jobs: DriverPayJobDetail[];
  payments: DriverPayPaymentDetail[];
}

// --- Driver Payments ---
export interface DriverPayment {
  id: string;
  driverId: string;
  organizationId: string;
  amount: number;
  paidAt: string;
  paymentMethod: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Expense Categories ---
export interface ExpenseCategory {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Expenses ---
export type ExpensePaymentMethod = 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'E_TRANSFER' | 'CREDIT_CARD' | 'OTHER';
export type RecurringFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Expense {
  id: string;
  organizationId: string;
  categoryId: string | null;
  description: string;
  amount: number;
  expenseDate: string;
  vendor: string | null;
  paymentMethod: ExpensePaymentMethod;
  reference: string | null;
  notes: string | null;
  recurring: boolean;
  recurringFrequency: RecurringFrequency | null;
  createdAt: string;
  updatedAt: string;
  categoryName?: string | null;
  categoryColor?: string | null;
}

export interface CreateExpenseInput {
  categoryId?: string | null;
  description: string;
  amount: number;
  expenseDate: string;
  vendor?: string | null;
  paymentMethod?: ExpensePaymentMethod;
  reference?: string | null;
  notes?: string | null;
  recurring?: boolean;
  recurringFrequency?: RecurringFrequency | null;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

// (JobInvoiceLine defined above)
