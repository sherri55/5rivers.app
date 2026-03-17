
export enum JobStatus {
  RAISED = 'Raised',
  PENDING = 'Pending',
  IN_TRANSIT = 'In Transit',
  COMPLETED = 'Completed'
}

export interface Job {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  status: JobStatus;
  driverId: string;
  driverName: string;
  unitId: string;
  rate: number;
  date: string;
  time: string;
}

export enum FleetStatus {
  ACTIVE = 'Active',
  MAINTENANCE = 'Maintenance',
  IN_TRANSIT = 'In Transit',
  AVAILABLE = 'Available'
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: string;
  cost: number;
  technician: string;
}

export interface FleetUnit {
  id: string;
  name: string;
  plate: string;
  model: string;
  status: FleetStatus;
  mileage?: string;
  oil?: string;
  issue?: string;
  history?: MaintenanceRecord[];
}

export interface Driver {
  id: string;
  name: string;
  license: string;
  status: FleetStatus;
  currentJobId?: string;
  avatar: string;
  performance: number; // 0-100
}

export interface Company {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  status: 'Active' | 'Inactive';
}

export interface JobType {
  id: string;
  name: string;
  baseRate: number;
  description: string;
  icon: string;
}

export enum InvoiceStatus {
  SENT = 'Sent',
  PAID = 'Paid',
  OVERDUE = 'Overdue'
}

export interface Invoice {
  id: string;
  jobId: string;
  customer: string;
  amount: number;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
}

export interface Action {
  id: string;
  type: 'Job Created' | 'Status Update' | 'Invoice Generated';
  description: string;
  time: string;
  refId: string;
  color: string;
}

export type ViewType = 
  | 'dashboard' 
  | 'jobs' 
  | 'fleet' 
  | 'billing' 
  | 'invoices' 
  | 'reports' 
  | 'companies' 
  | 'job-types' 
  | 'create-job' 
  | 'create-driver' 
  | 'create-company'
  | 'create-unit';
