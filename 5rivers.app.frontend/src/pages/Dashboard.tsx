import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building, Users, Truck, DollarSign, ClipboardList, TrendingUp, TrendingDown, Minus, Calendar, Eye } from "lucide-react"
import { useQuery } from "@apollo/client"
import { GET_DASHBOARD_STATS } from "@/lib/graphql/dashboard"
import { DashboardStatsData } from "@/lib/types/dashboard"
import { useState } from "react"
import { JobDetailModal } from "@/components/modals/JobDetailModal"

export function Dashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const { data, loading, error } = useQuery<DashboardStatsData>(GET_DASHBOARD_STATS, {
    variables: {
      year: selectedYear,
      month: selectedMonth
    }
  });

  if (error) {
    console.error('Dashboard error:', error);
  }

  const dashboardData = data?.dashboardStats;
  const monthlyComparison = dashboardData?.monthlyComparison;
  const overallStats = dashboardData?.overallStats;

  // Generate month options (last 12 months)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      options.push({
        value: `${year}-${month}`,
        label: monthName,
        year,
        month
      });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  const handleMonthChange = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (percentage: number) => {
    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  // Get trend icon and color
  const getTrendIcon = (change: number) => {
    if (change > 0) return { icon: TrendingUp, color: "text-green-600" };
    if (change < 0) return { icon: TrendingDown, color: "text-red-600" };
    return { icon: Minus, color: "text-gray-600" };
  };

  // Current month stats for the grid
  const currentMonthStats = monthlyComparison ? [
    {
      title: "Jobs This Month",
      value: monthlyComparison.current.totalJobs.toString(),
      change: `${monthlyComparison.jobsChange > 0 ? '+' : ''}${monthlyComparison.jobsChange} vs last month`,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
      changeValue: monthlyComparison.jobsChange
    },
    {
      title: "Revenue This Month",
      value: formatCurrency(monthlyComparison.current.totalAmount),
      change: formatPercentage(monthlyComparison.percentageChange) + " vs last month",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      changeValue: monthlyComparison.percentageChange
    },
    {
      title: "Active Dispatchers",
      value: monthlyComparison.current.totalDispatchers.toString(),
      change: `${monthlyComparison.current.totalDispatchers - monthlyComparison.previous.totalDispatchers > 0 ? '+' : ''}${monthlyComparison.current.totalDispatchers - monthlyComparison.previous.totalDispatchers} vs last month`,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      changeValue: monthlyComparison.current.totalDispatchers - monthlyComparison.previous.totalDispatchers
    },
    {
      title: "Active Drivers",
      value: monthlyComparison.current.totalDrivers.toString(),
      change: `${monthlyComparison.current.totalDrivers - monthlyComparison.previous.totalDrivers > 0 ? '+' : ''}${monthlyComparison.current.totalDrivers - monthlyComparison.previous.totalDrivers} vs last month`,
      icon: Truck,
      color: "text-orange-600",
      bg: "bg-orange-50",
      changeValue: monthlyComparison.current.totalDrivers - monthlyComparison.previous.totalDrivers
    }
  ] : [];

  // Overall stats for the second grid
  const overallStatsData = overallStats ? [
    {
      title: "Total Jobs",
      value: overallStats.totalJobs.toString(),
      subtitle: "All time",
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Total Revenue",
      value: formatCurrency(overallStats.totalAmount),
      subtitle: "All time",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Total Companies",
      value: overallStats.totalCompanies.toString(),
      subtitle: "Active clients",
      icon: Building,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      title: "Avg Job Value",
      value: formatCurrency(overallStats.averageJobValue),
      subtitle: "All time average",
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50"
    }
  ] : [];

  const recentJobs = dashboardData?.recentJobs?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-hero rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-white/90 text-lg">
              Overview of your trucking operations and business metrics
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Last Updated</span>
              <div className="text-lg font-bold">{new Date().toLocaleDateString()}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 min-w-[200px]">
              <div className="flex items-center gap-2 text-white">
                <Calendar className="h-4 w-4" />
                <Select 
                  value={`${selectedYear}-${selectedMonth}`} 
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="bg-transparent border-white/30 text-white">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-gradient-card shadow-card border-0">
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Current Month Stats Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Current Month Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentMonthStats.map((stat) => {
                const trendInfo = getTrendIcon(stat.changeValue);
                const TrendIcon = trendInfo.icon;
                
                return (
                  <Card key={stat.title} className="bg-gradient-card shadow-card border-0 hover:shadow-elevated transition-smooth">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <TrendIcon className={`h-3 w-3 ${trendInfo.color}`} />
                            <p className={`text-xs font-medium ${trendInfo.color}`}>{stat.change}</p>
                          </div>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                          <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Overall Stats Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Overall Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {overallStatsData.map((stat) => (
                <Card key={stat.title} className="bg-gradient-card shadow-card border-0 hover:shadow-elevated transition-smooth">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${stat.bg}`}>
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Recent Jobs */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Jobs</h2>
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <JobDetailModal
                  key={job.id}
                  job={job}
                  trigger={
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{job.id}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            job.invoiceStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                            job.invoiceStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {job.invoiceStatus || 'Draft'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{job.jobType?.company?.name || 'No Company'}</p>
                        <p className="text-sm text-muted-foreground">{job.driver?.name || 'No Driver'} • {new Date(job.jobDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{formatCurrency(job.calculatedAmount)}</p>
                          <p className="text-xs text-muted-foreground">
                            Driver pay: {job.driverPay ? formatCurrency(job.driverPay) : '$0'}
                          </p>
                          <p className="text-xs text-muted-foreground">{job.jobType?.title || 'No Job Type'}</p>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  }
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent jobs found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
