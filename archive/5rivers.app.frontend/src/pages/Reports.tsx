import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function Reports() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-navy-light border border-slate-800 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Analytics & Reports</h1>
        <p className="text-white/90 text-lg">
          Fleet analytics and reporting coming soon
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-navy-light border-slate-800">
          <CardHeader>
            <CardTitle className="text-foreground">Reports</CardTitle>
            <CardDescription>Generate and export fleet reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This section will include revenue reports, job analytics, and fleet utilization metrics.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-navy-light border-slate-800">
          <CardHeader>
            <CardTitle className="text-foreground">Analytics</CardTitle>
            <CardDescription>Dashboard metrics and insights</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Performance metrics and key analytics will be available here.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-navy-light border-slate-800">
          <CardHeader>
            <CardTitle className="text-foreground">Export</CardTitle>
            <CardDescription>Download data and reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Export capabilities for invoices, jobs, and fleet data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
