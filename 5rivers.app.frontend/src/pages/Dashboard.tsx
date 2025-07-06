import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building, Plus, Users, Truck, DollarSign, ClipboardList, FileText } from "lucide-react"

export function Dashboard() {
  const stats = [
    {
      title: "Total Companies",
      value: "24",
      change: "+2 this month",
      icon: Building,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Active Drivers",
      value: "156",
      change: "+12 this week",
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      title: "Fleet Units",
      value: "89",
      change: "+3 operational",
      icon: Truck,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      title: "Monthly Revenue",
      value: "$125,340",
      change: "+8.2% vs last month",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    }
  ]

  const recentJobs = [
    {
      id: "JOB-001",
      company: "ABC Logistics Inc.",
      driver: "John Smith",
      route: "Dallas → Houston",
      status: "In Transit",
      value: "$2,450"
    },
    {
      id: "JOB-002", 
      company: "Global Freight Solutions",
      driver: "Sarah Johnson",
      route: "Austin → San Antonio",
      status: "Completed",
      value: "$1,890"
    },
    {
      id: "JOB-003",
      company: "Rapid Transport Co.",
      driver: "Mike Wilson",
      route: "Fort Worth → El Paso",
      status: "Pending",
      value: "$3,200"
    }
  ]

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
          <div className="mt-4 sm:mt-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <span className="text-sm font-medium">Last Updated</span>
              <div className="text-lg font-bold">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-gradient-card shadow-card border-0 hover:shadow-elevated transition-smooth">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Recent Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{job.id}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      job.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      job.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                  <p className="text-sm text-muted-foreground">{job.route}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{job.value}</p>
                  <p className="text-xs text-muted-foreground">{job.driver}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create New Job
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Building className="h-4 w-4 mr-2" />
              Add Company
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Register Driver
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
