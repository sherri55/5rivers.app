import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, DollarSign, User, Receipt, Clock, Eye, Edit, FileText, AlertTriangle } from "lucide-react"
import { JobDetailModal } from "@/components/modals/JobDetailModal"
import { JobModal } from "@/components/modals/JobModal"
import { JobTypeViewModal } from "@/components/modals/JobTypeViewModal"
import { InvoiceViewModal } from "@/components/modals/InvoiceViewModal"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { formatDateForDisplay, formatTimeForDisplay } from "@/lib/utils/dateUtils"
import { useMutation } from "@apollo/client"
import { UPDATE_JOB } from "@/lib/graphql/jobs"
import { useToast } from "@/hooks/use-toast"

interface Job {
  id: string
  jobDate: string
  invoiceStatus: string
  weight?: number[]
  loads?: number
  startTime?: string
  endTime?: string
  paymentReceived: boolean
  driverPaid: boolean
  calculatedAmount?: number
  driverPay?: number
  jobType?: {
    id: string
    title: string
    rateOfJob?: number
    dispatchType?: string
    company?: {
      id: string
      name: string
    }
  }
  driver?: {
    id: string
    name: string
    hourlyRate?: number
  }
  dispatcher?: {
    id: string
    name: string
    commissionPercent?: number
  }
  unit?: {
    id: string
    name: string
  }
  invoice?: {
    id: string
    invoiceNumber: string
  }
}

interface JobListProps {
  jobs: Job[]
  onJobSuccess: () => void
  onDeleteJob: (jobId: string) => void
}

export function JobList({ jobs, onJobSuccess, onDeleteJob }: JobListProps) {
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  const [updateJob] = useMutation(UPDATE_JOB)
  const { toast } = useToast()
  const [localJobs, setLocalJobs] = useState<Job[]>(jobs)

  // Keep localJobs in sync with jobs prop
  React.useEffect(() => {
    setLocalJobs(jobs)
  }, [jobs])

  // Helper to update jobs in both localJobs and jobs prop array
  const updateJobsLocally = (ids: string[], changes: Partial<Job>) => {
    setLocalJobs(prev => prev.map(job => ids.includes(job.id) ? { ...job, ...changes } : job))
    jobs.forEach(job => {
      if (ids.includes(job.id)) Object.assign(job, changes)
    })
  }

  // Group jobs by month-year
  const groupJobsByMonth = (jobList: Job[]) => {
    const groups: { [key: string]: Job[] } = {}
    
    jobList.forEach(job => {
      if (job.jobDate) {
        const date = new Date(job.jobDate)
        if (!isNaN(date.getTime())) {
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (!groups[monthYear]) {
            groups[monthYear] = []
          }
          groups[monthYear].push(job)
        }
      }
    })

    // Sort groups by month-year (descending) and jobs within each group by date (descending)
    const sortedGroups: { [key: string]: Job[] } = {}
    Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .forEach(key => {
        sortedGroups[key] = groups[key].sort((a, b) => {
          const dateA = new Date(a.jobDate)
          const dateB = new Date(b.jobDate)
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0
          return dateB.getTime() - dateA.getTime()
        })
      })

    return sortedGroups
  }

  const groupedJobs = groupJobsByMonth(localJobs)

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const getStatusColor = (job: Job) => {
    if (job.paymentReceived && job.driverPaid) return "bg-green-100 text-green-800"
    if (job.paymentReceived) return "bg-blue-100 text-blue-800"
    return "bg-yellow-100 text-yellow-800"
  }

  // Check if a job has missing rate
  const hasMissingRate = (job: Job): boolean => {
    return !job.jobType?.rateOfJob || job.jobType.rateOfJob <= 0
  }

  // Format currency
  // Add HST (1.13%) to amount
  const addHST = (amount: number) => amount * 1.13;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Calculate commission for a job
  const getCommission = (job: Job) => {
    const commissionPercent = job?.dispatcher?.commissionPercent ?? 5;
    return addHST(job.calculatedAmount || 0) * (commissionPercent / 100);
  };

  // Calculate amount after commission for a job
  const getAmountAfterCommission = (job: Job) => {
    return addHST(job.calculatedAmount || 0) - getCommission(job);
  };

  // Calculate driver pay for a job
  const getDriverPay = (job: Job) => {
    const hourlyRate = job.driver?.hourlyRate ?? 0;
    return getAmountAfterCommission(job) * (hourlyRate / 100);
  };

  // Calculate totals for selected jobs
  const selectedJobsList = localJobs.filter(job => selectedJobIds.includes(job.id));
  const totalBeforeCommission = selectedJobsList.reduce((sum, job) => sum + addHST(job.calculatedAmount || 0), 0);
  const totalCommission = selectedJobsList.reduce((sum, job) => sum + getCommission(job), 0);
  const totalAfterCommission = selectedJobsList.reduce((sum, job) => sum + getAmountAfterCommission(job), 0);
  const totalDriverPay = selectedJobsList.reduce((sum, job) => sum + getDriverPay(job), 0);

  // Handle job selection
  const handleJobSelection = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobIds([...selectedJobIds, jobId])
    } else {
      setSelectedJobIds(selectedJobIds.filter(id => id !== jobId))
    }
  }

  // Calculate totals for selected jobs
  // Removed unused calculateSelectedJobsTotals function and fixed all driver pay calculations to use driver.hourlyRate

  return (
    <div className="space-y-6">
      {/* Selected Jobs Summary */}
      {selectedJobIds.length > 0 && (
        <Card className="bg-primary/5 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Selected Jobs Summary</span>
              <Badge variant="outline">{selectedJobIds.length} job(s) selected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-background rounded-lg border">
                <div className="text-sm text-muted-foreground">Amount (before commission)</div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(totalBeforeCommission)}
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="text-sm text-muted-foreground">Total Commission</div>
                <div className="text-2xl font-bold text-warning">
                  {formatCurrency(totalCommission)}
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="text-sm text-muted-foreground">Amount (after commission)</div>
                <div className="text-2xl font-bold text-accent">
                  {formatCurrency(totalAfterCommission)}
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="text-sm text-muted-foreground">Driver Pay</div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {formatCurrency(totalDriverPay)}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await Promise.all(selectedJobIds.map(jobId => updateJob({
                        variables: { input: { id: jobId, invoiceStatus: "RECEIVED" } }
                      })));
                      updateJobsLocally(selectedJobIds, { invoiceStatus: "RECEIVED" });
                      toast({ title: "Marked as Received", description: "All selected jobs marked as Received." });
                      setSelectedJobIds([]);
                      setTimeout(() => onJobSuccess(), 0);
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message || "Failed to update jobs.", variant: "destructive" });
                    }
                  }}
                >
                  Mark as Received
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await Promise.all(selectedJobIds.map(jobId => updateJob({
                        variables: { input: { id: jobId, driverPaid: true } }
                      })));
                      updateJobsLocally(selectedJobIds, { driverPaid: true });
                      toast({ title: "Marked as Driver Paid", description: "All selected jobs marked as Driver Paid." });
                      setSelectedJobIds([]);
                      setTimeout(() => onJobSuccess(), 0);
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message || "Failed to update jobs.", variant: "destructive" });
                    }
                  }}
                >
                  Mark as Driver Paid
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedJobIds([])}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(groupedJobs).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              No jobs match your search criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedJobs).map(([monthYear, monthJobs]) => (
          <div key={monthYear} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">{formatMonthYear(monthYear)}</h2>
              <Badge variant="outline" className="text-sm">
                {monthJobs.length} job{monthJobs.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="grid gap-4">
              {monthJobs.map((job: Job) => (
                <Card 
                  key={job.id} 
                  className={`hover:shadow-md transition-shadow ${
                    hasMissingRate(job) ? 'border-orange-500 border-2' : 
                    selectedJobIds.includes(job.id) ? 'border-primary border-2' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedJobIds.includes(job.id)}
                          onCheckedChange={(checked) => handleJobSelection(job.id, checked as boolean)}
                          className="h-5 w-5"
                        />
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          {formatDateForDisplay(job.jobDate, 'EEEE, MMMM d, yyyy')}
                        </CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(job)}>
                          {job.paymentReceived && job.driverPaid ? "Completed" : 
                           job.paymentReceived ? "Payment Received" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      Job ID: {job.id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {job.jobType && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="font-medium">Type:</span> {job.jobType.title}
                            {hasMissingRate(job) && (
                              <span className="ml-2 text-orange-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-xs">No rate</span>
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      
                      {job.driver && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="font-medium">Driver:</span> {job.driver.name}
                          </span>
                        </div>
                      )}
                      
                      {job.dispatcher && (
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="font-medium">Dispatcher:</span> {job.dispatcher.name}
                          </span>
                        </div>
                      )}
                      
                      {job.startTime && job.endTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="font-medium">Time:</span> {safeFormatTimeRange(job.startTime, job.endTime)}
                          </span>
                        </div>
                      )}
                      
                      {job.calculatedAmount !== undefined && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">
                            <div>
                              <span className="font-medium">Amount:</span> {formatCurrency(addHST(job.calculatedAmount))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Commission: {formatCurrency(getCommission(job))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              After comm: {formatCurrency(getAmountAfterCommission(job))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Driver pay: {formatCurrency(getDriverPay(job))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                      <JobDetailModal
                        trigger={
                          <Button variant="outline" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        }
                        job={job}
                      />
                      <JobModal
                        trigger={
                          <Button variant="outline" size="sm" title="Edit Job">
                            <Edit className="h-4 w-4" />
                          </Button>
                        }
                        job={job}
                        onSuccess={onJobSuccess}
                      />
                      {job.jobType && (
                        <JobTypeViewModal
                          trigger={
                            <Button variant="outline" size="sm" title="View Job Type">
                              <FileText className="h-4 w-4" />
                            </Button>
                          }
                          jobTypeId={job.jobType.id}
                        />
                      )}
                      {job.invoice?.id && (
                        <InvoiceViewModal
                          trigger={
                            <Button variant="outline" size="sm" title="View Invoice">
                              <Receipt className="h-4 w-4" />
                            </Button>
                          }
                          invoiceId={job.invoice.id}
                        />
                      )}
                      <ConfirmDeleteDialog
                        title="Delete Job"
                        description="Are you sure you want to delete this job? This action cannot be undone."
                        onConfirm={() => onDeleteJob(job.id)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// Fix time formatting for invalid values
function safeFormatTimeRange(start?: string, end?: string) {
  try {
    // If end is provided, concatenate both, else just format start
    if (start && end) {
      return formatTimeForDisplay(start) + " - " + formatTimeForDisplay(end)
    } else if (start) {
      return formatTimeForDisplay(start)
    } else {
      return "-"
    }
  } catch {
    return "-"
  }
}