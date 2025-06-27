"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { 
  Building2, 
  Users, 
  Truck, 
  FileText, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Activity
} from "lucide-react";

interface DashboardStats {
  totalCompanies: number;
  totalDrivers: number;
  activeJobs: number;
  pendingInvoices: number;
  monthlyRevenue: number;
  completedJobsThisMonth: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalDrivers: 0,
    activeJobs: 0,
    pendingInvoices: 0,
    monthlyRevenue: 0,
    completedJobsThisMonth: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading stats
    setTimeout(() => {
      setStats({
        totalCompanies: 23,
        totalDrivers: 15,
        activeJobs: 8,
        pendingInvoices: 12,
        monthlyRevenue: 145000,
        completedJobsThisMonth: 47,
      });
      setLoading(false);
    }, 1000);
  }, []);

  const statCards = [
    {
      title: "Total Companies",
      value: stats.totalCompanies,
      icon: Building2,
      color: "from-blue-500 to-blue-600",
      trend: "+12%",
    },
    {
      title: "Active Drivers",
      value: stats.totalDrivers,
      icon: Users,
      color: "from-green-500 to-green-600",
      trend: "+3%",
    },
    {
      title: "Active Jobs",
      value: stats.activeJobs,
      icon: Truck,
      color: "from-orange-500 to-orange-600",
      trend: "-5%",
    },
    {
      title: "Pending Invoices",
      value: stats.pendingInvoices,
      icon: FileText,
      color: "from-purple-500 to-purple-600",
      trend: "+8%",
    },
  ];

  const revenueCards = [
    {
      title: "Monthly Revenue",
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
      trend: "+15%",
    },
    {
      title: "Completed Jobs",
      value: stats.completedJobsThisMonth,
      icon: Activity,
      color: "from-indigo-500 to-indigo-600",
      trend: "+22%",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-slate-200 rounded-2xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600 text-lg">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={card.title} className="hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-r ${card.color}`}>
                  <card.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-slate-900">
                  {card.value}
                </div>
                <div className={`text-sm font-medium ${
                  card.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {card.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {revenueCards.map((card, index) => (
          <Card key={card.title} className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-r ${card.color}`}>
                  <card.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-slate-900">
                  {card.value}
                </div>
                <div className="text-sm font-medium text-green-600">
                  {card.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:shadow-md transition-all duration-200 text-left group">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Add Company</div>
                  <div className="text-sm text-slate-600">Create new client</div>
                </div>
              </div>
            </button>
            
            <button className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 hover:shadow-md transition-all duration-200 text-left group">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Add Driver</div>
                  <div className="text-sm text-slate-600">Register new driver</div>
                </div>
              </div>
            </button>
            
            <button className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200 hover:shadow-md transition-all duration-200 text-left group">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500 rounded-lg group-hover:bg-orange-600 transition-colors">
                  <Truck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Create Job</div>
                  <div className="text-sm text-slate-600">Schedule new job</div>
                </div>
              </div>
            </button>
            
            <button className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200 hover:shadow-md transition-all duration-200 text-left group">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">New Invoice</div>
                  <div className="text-sm text-slate-600">Generate invoice</div>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
