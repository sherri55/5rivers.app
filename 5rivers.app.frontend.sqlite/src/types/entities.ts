// Centralized entity interfaces for the application

export interface Company {
  companyId?: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  jobTypesCount?: number;
}

export interface Unit {
  unitId?: string;
  name: string;
  plateNumber?: string;
  vin?: string;
  color?: string;
  description?: string;
  jobsCount?: number;
}

export interface Driver {
  driverId?: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  hourlyRate?: number;
}

export interface Dispatcher {
  dispatcherId?: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  commissionPercent?: number;
}

export interface Invoice {
  invoiceId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dispatcherId?: string;
  billedTo: string;
  billedEmail: string;
  status?: string;
  subTotal?: number | string;
  commission?: number | string;
  hst?: number | string;
  total?: number | string;
  jobs?: Array<Job>;
  dispatcher?: { name: string };
}

export interface Job {
  jobId?: string;
  jobDate: string;
  jobTypeId: string;
  driverId: string;
  unitId?: string;
  dispatcherId?: string;
  status?: string;
  invoiceStatus?: string;
  jobGrossAmount?: number | string;
  invoiceId?: string;
  paymentReceived?: boolean;
  driverPaid?: boolean;
  startTime?: string;
  endTime?: string;
  weight?: string | string[];
  loads?: number;
  tickets?: string | string[];
  ticketIds?: string | string[];
  imageUrls?: string[];
}

export interface JobType {
  jobTypeId?: string;
  title: string;
  startLocation?: string;
  endLocation?: string;
  dispatchType?: string;
  rateOfJob?: number | string;
  companyId?: string;
}
