export interface MonthlyStats {
  totalJobs: number;
  totalDispatchers: number;
  totalDrivers: number;
  totalInvoices: number;
  totalAmount: number;
  averageJobValue: number;
}

export interface MonthlyComparison {
  current: MonthlyStats;
  previous: MonthlyStats;
  percentageChange: number;
  jobsChange: number;
  amountChange: number;
}

export interface OverallStats {
  totalJobs: number;
  totalDispatchers: number;
  totalDrivers: number;
  totalInvoices: number;
  totalAmount: number;
  totalCompanies: number;
  averageJobValue: number;
}

export interface DashboardJob {
  id: string;
  jobDate: string;
  calculatedAmount: number;
  invoiceStatus: string;
  ticketIds: string[];
  jobType?: {
    id: string;
    title: string;
    company?: {
      id: string;
      name: string;
    };
  };
  driver?: {
    id: string;
    name: string;
  };
  dispatcher?: {
    id: string;
    name: string;
  };
}

export interface DashboardCompany {
  id: string;
  name: string;
  industry?: string;
  location?: string;
}

export interface DashboardStats {
  monthlyComparison: MonthlyComparison;
  overallStats: OverallStats;
  recentJobs: DashboardJob[];
  topCompanies: DashboardCompany[];
}

export interface DashboardStatsData {
  dashboardStats: DashboardStats;
}
