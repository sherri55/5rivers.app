
import { Job, JobStatus, FleetUnit, FleetStatus, Driver, Action, Invoice, InvoiceStatus, Company, JobType } from './types';

export const MOCK_JOBS: Job[] = [
  { id: '#8842', customer: 'Global Foods Inc.', origin: 'Toronto, ON', destination: 'Chicago, IL', status: JobStatus.RAISED, driverId: 'D1', driverName: 'John Doe', unitId: 'UNIT-404', rate: 2400, date: 'Oct 24', time: '08:00' },
  { id: '#8841', customer: 'TechStream Logistics', origin: 'Dallas, TX', destination: 'Houston, TX', status: JobStatus.COMPLETED, driverId: 'D2', driverName: 'Sarah Smith', unitId: 'UNIT-102', rate: 850, date: 'Oct 22', time: '06:30' },
  { id: '#8840', customer: 'Titan Freight Co.', origin: 'Miami, FL', destination: 'Orlando, FL', status: JobStatus.PENDING, driverId: '', driverName: 'Unassigned', unitId: '', rate: 1200, date: 'Oct 26', time: '09:00' },
  { id: '#8839', customer: 'Amazon Freight', origin: 'Seattle, WA', destination: 'San Diego, CA', status: JobStatus.IN_TRANSIT, driverId: 'D3', driverName: 'Marcus Sterling', unitId: 'UNIT-550', rate: 3100, date: 'Oct 20', time: '05:00' }
];

export const MOCK_COMPANIES: Company[] = [
  { id: 'CO-01', name: 'Global Foods Inc.', contact: 'Alice Wonderland', email: 'alice@globalfoods.com', address: '123 Food St, Toronto', status: 'Active' },
  { id: 'CO-02', name: 'TechStream Logistics', contact: 'Bob Builder', email: 'bob@techstream.com', address: '456 Innovation Ave, Dallas', status: 'Active' },
  { id: 'CO-03', name: 'Titan Freight Co.', contact: 'Charlie Brown', email: 'charlie@titan.com', address: '789 Ocean Way, Miami', status: 'Active' },
  { id: 'CO-04', name: 'Amazon Freight', contact: 'Zack Bezos', email: 'zack@amazon.com', address: '1 Amazon Plaza, Seattle', status: 'Active' }
];

export const MOCK_JOB_TYPES: JobType[] = [
  { id: 'JT-01', name: 'Refrigerated (Reefer)', baseRate: 2.50, description: 'Temperature controlled transport for perishables.', icon: 'ac_unit' },
  { id: 'JT-02', name: 'Dry Van', baseRate: 1.80, description: 'Standard enclosed trailer for general cargo.', icon: 'inventory_2' },
  { id: 'JT-03', name: 'Flatbed', baseRate: 2.20, description: 'Open platform for oversized or odd-shaped loads.', icon: 'width_full' },
  { id: 'JT-04', name: 'Hazmat', baseRate: 4.50, description: 'Transport for hazardous materials requiring certification.', icon: 'warning' }
];

export const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-1001', jobId: '#8841', customer: 'TechStream Logistics', amount: 850, date: 'Oct 22, 2023', dueDate: 'Nov 05, 2023', status: InvoiceStatus.PAID },
  { id: 'INV-1002', jobId: '#8835', customer: 'Global Foods Inc.', amount: 3200, date: 'Oct 15, 2023', dueDate: 'Oct 29, 2023', status: InvoiceStatus.OVERDUE },
  { id: 'INV-1003', jobId: '#8832', customer: 'Retail Giant', amount: 1250, date: 'Oct 10, 2023', dueDate: 'Oct 24, 2023', status: InvoiceStatus.SENT }
];

export const MOCK_UNITS: FleetUnit[] = [
  { 
    id: '402', name: 'Freightliner Cascadia', plate: 'ABC-1234', model: '2023', status: FleetStatus.ACTIVE, mileage: '12,450 mi', oil: '84%',
    history: [
      { id: 'M1', date: 'Sep 12, 2023', type: 'Oil Change', cost: 180, technician: 'Mike R.' },
      { id: 'M2', date: 'Jul 05, 2023', type: 'Tire Rotation', cost: 450, technician: 'Sam B.' }
    ]
  },
  { id: '510', name: 'Kenworth T680', plate: 'XYZ-9876', model: '2022', status: FleetStatus.IN_TRANSIT },
  { id: '305', name: 'Peterbilt 579', plate: 'LMN-5544', model: '2021', status: FleetStatus.MAINTENANCE, issue: 'Brake system inspection required' },
  { id: '412', name: 'Volvo VNL 860', plate: 'KKK-0012', model: '2024', status: FleetStatus.ACTIVE }
];

export const MOCK_DRIVERS: Driver[] = [
  { id: 'D1', name: 'John Doe', license: 'DL-88392', status: FleetStatus.IN_TRANSIT, currentJobId: '#8842', avatar: 'https://picsum.photos/seed/john/200', performance: 94 },
  { id: 'D2', name: 'Sarah Smith', license: 'DL-11209', status: FleetStatus.AVAILABLE, avatar: 'https://picsum.photos/seed/sarah/200', performance: 98 },
  { id: 'D3', name: 'Marcus Sterling', license: 'DL-44332', status: FleetStatus.IN_TRANSIT, currentJobId: '#8839', avatar: 'https://picsum.photos/seed/marcus/200', performance: 89 }
];

export const MOCK_ACTIONS: Action[] = [
  { id: '1', type: 'Job Created', description: 'New delivery created', time: '2m ago', refId: '#8842', color: 'emerald' },
  { id: '2', type: 'Status Update', description: 'En route to Chicago', time: '15m ago', refId: '#8842', color: 'amber' },
  { id: '3', type: 'Invoice Generated', description: 'INV-1004 awaiting review', time: '1h ago', refId: 'INV-1004', color: 'slate' }
];

export const CHART_DATA = [
  { name: 'Mon', volume: 40, revenue: 12000 },
  { name: 'Tue', volume: 30, revenue: 8500 },
  { name: 'Wed', volume: 75, revenue: 21000 },
  { name: 'Thu', volume: 25, revenue: 7000 },
  { name: 'Fri', volume: 85, revenue: 25000 },
  { name: 'Sat', volume: 15, revenue: 4000 },
  { name: 'Sun', volume: 10, revenue: 2500 },
];
