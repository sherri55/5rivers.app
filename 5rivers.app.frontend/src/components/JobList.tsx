import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, DollarSign, User, Receipt, Clock, Eye, Edit, FileText, AlertTriangle, Truck, Weight, Package } from "lucide-react"
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
    switch (job.invoiceStatus) {
      case "RECEIVED":
        return job.driverPaid ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800";
      case "PENDING":
      default:
        return "bg-yellow-100 text-yellow-800";
    }
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

  // Get job-specific attribute based on dispatch type
  const getJobSpecificAttribute = (job: Job) => {
    const dispatchType = job.jobType?.dispatchType?.toLowerCase();
    
    switch (dispatchType) {
      case 'hourly':
        return (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{safeFormatTimeRange(job.startTime, job.endTime)}</span>
          </div>
        );
      
      case 'tonnage':
        const weightDisplay = job.weight && Array.isArray(job.weight) 
          ? job.weight.reduce((sum, w) => sum + w, 0).toFixed(1) + ' tons'
          : job.weight 
            ? `${job.weight} tons`
            : 'No weight';
        return (
          <div className="flex items-center gap-1">
            <Weight className="h-3 w-3" />
            <span>{weightDisplay}</span>
          </div>
        );
      
      case 'load':
        return (
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            <span>{job.loads || 0} loads</span>
          </div>
        );
      
      case 'fixed':
        return (
          <div className="flex items-center gap-1">
            <span className="text-xs bg-muted rounded px-1">FIXED</span>
            <span>Fixed rate</span>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{safeFormatTimeRange(job.startTime, job.endTime)}</span>
          </div>
        );
    }
  };

  // Get color scheme for dispatch type
  const getDispatchTypeColors = (dispatchType: string) => {
    switch (dispatchType.toLowerCase()) {
      case 'hourly':
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          background: 'bg-blue-50',
          icon: 'text-blue-600',
          text: 'text-blue-700'
        };
      case 'tonnage':
        return {
          badge: 'bg-green-100 text-green-800 border-green-200',
          background: 'bg-green-50',
          icon: 'text-green-600',
          text: 'text-green-700'
        };
      case 'load':
        return {
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          background: 'bg-purple-50',
          icon: 'text-purple-600',
          text: 'text-purple-700'
        };
      case 'fixed':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          background: 'bg-amber-50',
          icon: 'text-amber-600',
          text: 'text-amber-700'
        };
      default:
        return {
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          background: 'bg-gray-50',
          icon: 'text-gray-600',
          text: 'text-gray-700'
        };
    }
  };

  // Grid-optimized version with label and value
  const getJobSpecificAttributeForGrid = (job: Job) => {
    const dispatchType = job.jobType?.dispatchType?.toLowerCase() || 'unknown';
    const colors = getDispatchTypeColors(dispatchType);
    const rate = job.jobType?.rateOfJob;
    
    switch (dispatchType) {
      case 'hourly':
        return (
          <>
            <div className={`flex items-center gap-1 ${colors.text}`}>
              <Clock className={`h-3 w-3 ${colors.icon}`} />
              <span>Time:</span>
            </div>
            <div className={`truncate ml-1 ${colors.text}`}>
              <span className="font-medium">{safeFormatTimeRange(job.startTime, job.endTime)}</span>
              {rate && <span className="text-xs ml-1">(${rate}/hr)</span>}
            </div>
          </>
        );
      
      case 'tonnage':
        const weightDisplay = job.weight && Array.isArray(job.weight) 
          ? job.weight.reduce((sum, w) => sum + w, 0).toFixed(1) + ' tons'
          : job.weight 
            ? `${job.weight} tons`
            : 'No weight';
        return (
          <>
            <div className={`flex items-center gap-1 ${colors.text}`}>
              <Weight className={`h-3 w-3 ${colors.icon}`} />
              <span>Weight:</span>
            </div>
            <div className={`truncate ml-1 ${colors.text}`}>
              <span className="font-medium">{weightDisplay}</span>
              {rate && <span className="text-xs ml-1">(${rate}/ton)</span>}
            </div>
          </>
        );
      
      case 'load':
        return (
          <>
            <div className={`flex items-center gap-1 ${colors.text}`}>
              <Package className={`h-3 w-3 ${colors.icon}`} />
              <span>Loads:</span>
            </div>
            <div className={`truncate ml-1 ${colors.text}`}>
              <span className="font-medium">{job.loads || 0}</span>
              {rate && <span className="text-xs ml-1">(${rate}/load)</span>}
            </div>
          </>
        );
      
      case 'fixed':
        return (
          <>
            <div className={`flex items-center gap-1 ${colors.text}`}>
              <DollarSign className={`h-3 w-3 ${colors.icon}`} />
              <span>Rate:</span>
            </div>
            <div className={`truncate ml-1 ${colors.text}`}>
              <span className="font-medium">
                {rate ? `$${rate}` : 'Not set'}
              </span>
              {rate && <span className="text-xs ml-1">(fixed)</span>}
            </div>
          </>
        );
      
      default:
        return (
          <>
            <div className={`flex items-center gap-1 ${colors.text}`}>
              <Clock className={`h-3 w-3 ${colors.icon}`} />
              <span>Time:</span>
            </div>
            <div className={`truncate ml-1 ${colors.text}`}>
              <span className="font-medium">{safeFormatTimeRange(job.startTime, job.endTime)}</span>
              {rate && <span className="text-xs ml-1">(${rate}/hr)</span>}
            </div>
          </>
        );
    }
  };


  // --- New: Selected jobs and batch update logic ---
  const selectedJobsList = localJobs.filter(job => selectedJobIds.includes(job.id));
  const totalBeforeCommission = selectedJobsList.reduce((sum, job) => sum + addHST(job.calculatedAmount || 0), 0);
  const totalCommission = selectedJobsList.reduce((sum, job) => sum + getCommission(job), 0);
  const totalAfterCommission = selectedJobsList.reduce((sum, job) => sum + getAmountAfterCommission(job), 0);
  const totalDriverPay = selectedJobsList.reduce((sum, job) => sum + getDriverPay(job), 0);

  const handleJobSelection = (jobId: string, checked: boolean) => {
    setSelectedJobIds(prev => checked ? [...prev, jobId] : prev.filter(id => id !== jobId));
  };

  // Batch update handler
  const handleBatchUpdate = async (changes: Partial<Job>, successMsg: string) => {
    if (selectedJobIds.length === 0) return;
    try {
      await Promise.all(selectedJobIds.map(jobId => updateJob({ variables: { input: { id: jobId, ...changes } } })));
      setLocalJobs(prev => prev.map(job => selectedJobIds.includes(job.id) ? { ...job, ...changes } : job));
      toast({ title: successMsg, description: `All selected jobs updated.`, variant: "default" });
      setSelectedJobIds([]);
      setTimeout(() => onJobSuccess(), 0);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update jobs.", variant: "destructive" });
    }
  };

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
                  onClick={() => handleBatchUpdate({ invoiceStatus: "RECEIVED" }, "Marked as Received")}
                >
                  Mark as Received
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBatchUpdate({ driverPaid: true }, "Marked as Driver Paid")}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {monthJobs.map((job: Job) => (
                <Card 
                  key={job.id} 
                  className={`hover:shadow-md transition-shadow ${
                    hasMissingRate(job) ? 'border-orange-500 border-2' : 
                    selectedJobIds.includes(job.id) ? 'border-primary border-2' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedJobIds.includes(job.id)}
                          onCheckedChange={(checked) => handleJobSelection(job.id, checked as boolean)}
                          className="h-4 w-4"
                        />
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar className="h-4 w-4 text-primary" />
                            {formatDateForDisplay(job.jobDate, 'EEE, MMM d, yyyy')}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            ID: {job.id.slice(-8)}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={getStatusColor(job)} variant="secondary">
                        {job.invoiceStatus === "RECEIVED" && job.driverPaid ? "Completed"
                          : job.invoiceStatus === "RECEIVED" ? "Received"
                          : "Pending"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* More compact layout */}
                    <div className="space-y-3">
                      {/* Primary Info Row */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getDispatchTypeColors(job.jobType?.dispatchType || 'unknown').badge}`}
                          >
                            {job.jobType?.dispatchType || 'Unknown'}
                          </Badge>
                          <span className="text-sm font-medium truncate">
                            {job.jobType?.title || 'No type assigned'}
                          </span>
                          {hasMissingRate(job) && (
                            <span className="text-orange-600 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="text-xs">No rate</span>
                            </span>
                          )}
                        </div>
                        
                        {/* Amount */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Amount:</span>
                          <span className="text-sm font-medium">
                            {job.calculatedAmount !== undefined ? formatCurrency(addHST(job.calculatedAmount)) : 'Not calculated'}
                          </span>
                        </div>
                      </div>

                      {/* Secondary Info - Styled like job-specific attributes */}
                      <div className="space-y-1 text-xs">
                        {/* Driver */}
                        <div className="flex items-center justify-between rounded px-2 py-1 bg-slate-50">
                          <div className="flex items-center gap-1 text-slate-700">
                            <User className="h-3 w-3 text-slate-600" />
                            <span>Driver:</span>
                          </div>
                          <div className="truncate ml-1 text-slate-700">
                            <span className="font-medium">{job.driver?.name || 'None'}</span>
                            {job.driver?.hourlyRate && (
                              <span className="text-xs ml-1">({job.driver.hourlyRate}%)</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Dispatcher */}
                        <div className="flex items-center justify-between rounded px-2 py-1 bg-indigo-50">
                          <div className="flex items-center gap-1 text-indigo-700">
                            <Receipt className="h-3 w-3 text-indigo-600" />
                            <span>Dispatcher:</span>
                          </div>
                          <div className="truncate ml-1 text-indigo-700">
                            <span className="font-medium">{job.dispatcher?.name || 'None'}</span>
                            {job.dispatcher?.commissionPercent && (
                              <span className="text-xs ml-1">({job.dispatcher.commissionPercent}%)</span>
                            )}
                          </div>
                        </div>

                        {/* Unit - Always show for consistency */}
                        <div className="flex items-center justify-between rounded px-2 py-1 bg-orange-50">
                          <div className="flex items-center gap-1 text-orange-700">
                            <Truck className="h-3 w-3 text-orange-600" />
                            <span>Unit:</span>
                          </div>
                          <span className="truncate ml-1 font-medium text-orange-700">
                            {job.unit?.name || 'None'}
                          </span>
                        </div>

                        {/* Conditional display based on dispatch type */}
                        <div className={`flex items-center justify-between rounded px-2 py-1 ${getDispatchTypeColors(job.jobType?.dispatchType || 'unknown').background}`}>
                          {getJobSpecificAttributeForGrid(job)}
                        </div>
                      </div>

                      {/* Financial breakdown - compact for grid */}
                      {job.calculatedAmount !== undefined && (
                        <div className="text-xs bg-muted/20 rounded p-2 space-y-1">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Commission:</span>
                            <span>{formatCurrency(getCommission(job))}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>After comm:</span>
                            <span>{formatCurrency(getAmountAfterCommission(job))}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Driver pay:</span>
                            <span>{formatCurrency(getDriverPay(job))}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end gap-1 mt-3">
                      <JobDetailModal
                        trigger={
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Details">
                            <Eye className="h-3 w-3" />
                          </Button>
                        }
                        job={job}
                      />
                      <JobModal
                        trigger={
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit Job">
                            <Edit className="h-3 w-3" />
                          </Button>
                        }
                        job={job}
                        onSuccess={onJobSuccess}
                      />
                      {job.jobType && (
                        <JobTypeViewModal
                          trigger={
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Job Type">
                              <FileText className="h-3 w-3" />
                            </Button>
                          }
                          jobTypeId={job.jobType.id}
                        />
                      )}
                      {job.invoice?.id && (
                        <InvoiceViewModal
                          trigger={
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Invoice">
                              <Receipt className="h-3 w-3" />
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
      return "No time set"
    }
  } catch {
    return "No time set"
  }
}