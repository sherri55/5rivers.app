/**
 * Shared Job type - used across Jobs page, modals, and components
 */

export interface JobCompany {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  location?: string;
}

export interface JobType {
  id: string;
  title: string;
  rateOfJob?: number;
  dispatchType?: string;
  startLocation?: string;
  endLocation?: string;
  company?: JobCompany;
}

export interface JobDriver {
  id: string;
  name: string;
  hourlyRate?: number;
  email?: string;
  phone?: string;
}

export interface JobDispatcher {
  id: string;
  name: string;
  commissionPercent?: number;
  email?: string;
  phone?: string;
}

export interface JobUnit {
  id: string;
  name: string;
  plateNumber?: string;
  color?: string;
}

export interface JobInvoice {
  id: string;
  invoiceNumber: string;
  status?: string;
}

export interface Job {
  id: string;
  jobDate: string;
  invoiceStatus: string;
  weight?: number[];
  loads?: number;
  startTime?: string;
  endTime?: string;
  amount?: number;
  driverPaid: boolean;
  calculatedAmount?: number;
  calculatedHours?: number;
  driverPay?: number;
  ticketIds?: string[];
  imageUrls?: string;
  images?: string[];
  updatedAt?: string;
  jobType?: JobType;
  driver?: JobDriver;
  dispatcher?: JobDispatcher;
  unit?: JobUnit;
  invoice?: JobInvoice;
}
