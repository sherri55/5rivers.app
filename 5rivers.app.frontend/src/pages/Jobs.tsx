import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Plus, Calendar, DollarSign, Truck, User, List, ChevronLeft, ChevronRight, Eye, Edit, FileText, Receipt, Clock, AlertTriangle, Table, Check, X } from "lucide-react"
import { GET_JOBS } from "@/lib/graphql/jobs"
import { DELETE_JOB } from "@/lib/graphql/mutations"
import { UPDATE_JOB } from "@/lib/graphql/jobs"
import { JobModal } from "@/components/modals/JobModal"
import { JobDetailModal } from "@/components/modals/JobDetailModal"
import { JobTypeViewModal } from "@/components/modals/JobTypeViewModal"
import { InvoiceViewModal } from "@/components/modals/InvoiceViewModal"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { JobList } from "@/components/JobList"
import { useToast } from "@/hooks/use-toast"
import { parseBackendDate, formatDateForDisplay, formatTimeRange, formatWeightForDisplay } from "@/lib/utils/dateUtils"

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
  }
  dispatcher?: {
    id: string
    name: string
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

// Calculation helpers for commission and driver pay
// Add HST (1.13%) to amount
const addHST = (amount: number) => amount * 1.13;
const getCommission = (job: Job) => {
  const commissionPercent = job?.dispatcher?.commissionPercent ?? 5;
  return addHST(job.calculatedAmount || 0) * (commissionPercent / 100);
};
const getAmountAfterCommission = (job: Job) => {
  return addHST(job.calculatedAmount || 0) - getCommission(job);
};
const getDriverPay = (job: Job) => {
  const hourlyRate = job.driver?.hourlyRate ?? 0;
  return getAmountAfterCommission(job) * (hourlyRate / 100);
};

// Calendar View Component
interface CalendarViewProps {
  jobs: Job[]
  currentDate: Date
  onDateChange: (date: Date) => void
  onJobSuccess: () => void
  onDeleteJob: (jobId: string) => void
}

function CalendarView({ jobs, currentDate, onDateChange, onJobSuccess, onDeleteJob }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<number | null>(null)
  const [showDateModal, setShowDateModal] = useState(false)
  const { toast } = useToast();
  const [updateJob] = useMutation(UPDATE_JOB);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  
  // Filter jobs for the current month
  const monthJobs = jobs.filter(job => {
    const jobDate = parseBackendDate(job.jobDate)
    if (!jobDate) return false
    return jobDate.getMonth() === currentDate.getMonth() && 
           jobDate.getFullYear() === currentDate.getFullYear()
  })

  // Group jobs by day
  const jobsByDay: { [key: number]: Job[] } = {}
  monthJobs.forEach(job => {
    const jobDate = parseBackendDate(job.jobDate)
    if (jobDate) {
      const day = jobDate.getDate()
      if (!jobsByDay[day]) {
        jobsByDay[day] = []
      }
      jobsByDay[day].push(job)
    }
  })

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    onDateChange(newDate)
  }

  const getStatusColor = (job: Job) => {
    if (job.invoiceStatus === 'RECEIVED' && job.driverPaid) return "bg-green-500"
    if (job.invoiceStatus === 'RECEIVED') return "bg-blue-500"
    return "bg-yellow-500"
  }

  const getSelectedDateJobs = () => {
    if (!selectedDate) return []
    return jobsByDay[selectedDate] || []
  }

  const handleDateClick = (day: number) => {
    const dayJobs = jobsByDay[day] || []
    if (dayJobs.length > 0) {
      setSelectedDate(day)
      setShowDateModal(true)
    }
  }

  // Utility function to check if a job has missing rate
  const hasMissingRate = (job: Job): boolean => {
    return !job.jobType?.rateOfJob || job.jobType.rateOfJob <= 0
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="p-1 h-32"></div>
            ))}
            
            {/* Calendar days */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dayJobs = jobsByDay[day] || []
              const hasJobs = dayJobs.length > 0
              
              return (
                <div 
                  key={day} 
                  className={`border rounded-lg p-1 min-h-[120px] transition-colors relative ${
                    hasJobs ? 'cursor-pointer hover:bg-muted/50 hover:shadow-md' : ''
                  }`}
                  onClick={() => hasJobs && handleDateClick(day)}
                >
                  <div className="text-sm font-medium mb-1 text-center flex items-center justify-between">
                    <span>{day}</span>
                    {hasJobs && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {dayJobs.length}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {/* Show first 3 jobs with better layout */}
                    {dayJobs.slice(0, 3).map((job) => (
                      <div
                        key={job.id}
                        className={`text-xs rounded-md p-1.5 border-l-2 transition-all ${
                          hasMissingRate(job)
                            ? "bg-orange-50 border-orange-500 text-orange-800"
                            : job.invoiceStatus === 'RECEIVED' && job.driverPaid
                            ? "bg-green-50 border-green-500 text-green-800"
                            : job.invoiceStatus === 'RECEIVED'
                            ? "bg-blue-50 border-blue-500 text-blue-800"
                            : "bg-yellow-50 border-yellow-500 text-yellow-800"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-medium truncate text-xs flex items-center gap-1" title={job.jobType?.title || 'Unknown Job'}>
                          <span>{job.jobType?.title?.substring(0, 20) || 'Unknown Job'}</span>
                          {(job.jobType?.title?.length || 0) > 20 && '...'}
                          {hasMissingRate(job) && (
                            <AlertTriangle className="h-2.5 w-2.5 text-orange-600 flex-shrink-0" />
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-xs text-muted-foreground truncate">
                            <div className="flex items-center gap-1">
                              <User className="h-2.5 w-2.5" />
                              <span>{job.driver?.name?.substring(0, 8) || 'No driver'}</span>
                            </div>
                            {job.dispatcher && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Receipt className="h-2.5 w-2.5" />
                                <span>{job.dispatcher.name.substring(0, 8)}</span>
                              </div>
                            )}
                          </div>
                          
                        {job.calculatedAmount && (
                          <div className="text-xs font-medium">
                            Amount: ${job.calculatedAmount.toFixed(2)}
                          </div>
                        )}
                        {job.calculatedAmount && (
                          <div className="text-xs text-muted-foreground">
                            Commission: ${getCommission(job).toFixed(2)} | After comm: ${getAmountAfterCommission(job).toFixed(2)} | Driver pay: ${getDriverPay(job).toFixed(2)}
                          </div>
                        )}
                        </div>
                        
                        {job.startTime && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTimeRange(job.startTime, job.endTime)}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Show "+X more" indicator if there are more than 3 jobs */}
                    {dayJobs.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center p-1.5 bg-muted/30 rounded border-2 border-dashed border-muted-foreground/30">
                        +{dayJobs.length - 3} more jobs
                        <div className="text-xs text-muted-foreground/70">Click to view all</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Date Jobs Modal */}
      <Dialog open={showDateModal} onOpenChange={setShowDateModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Jobs for {monthNames[currentDate.getMonth()]} {selectedDate}, {currentDate.getFullYear()}
              <Badge variant="outline">{getSelectedDateJobs().length} job(s)</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {getSelectedDateJobs().map((job) => (
              <Card 
                key={job.id} 
                className={`hover:shadow-md transition-shadow ${
                  hasMissingRate(job) ? 'border-orange-500 border-2' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(job)}`} />
                        <h4 className="font-medium text-base">{job.jobType?.title || 'Unknown Job'}</h4>
                        {hasMissingRate(job) && (
                          <span className="inline-flex items-center gap-1 text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs">No rate</span>
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {job.invoiceStatus}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{job.driver?.name || 'No driver assigned'}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Receipt className="h-4 w-4" />
                          <span>{job.dispatcher?.name || 'No dispatcher assigned'}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Truck className="h-4 w-4" />
                          <span>{job.unit?.name || 'No unit assigned'}</span>
                        </div>
                        
                        {job.startTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTimeRange(job.startTime, job.endTime)}</span>
                          </div>
                        )}
                        
                        {job.calculatedAmount && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">Amount: ${job.calculatedAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {job.calculatedAmount && (
                          <div className="text-xs text-muted-foreground">
                            Commission: ${getCommission(job).toFixed(2)} | After comm: ${getAmountAfterCommission(job).toFixed(2)} | Driver pay: ${getDriverPay(job).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2 ml-4">
                      {/* Quick action buttons - independent of each other */}
                      <Button
                        variant="outline"
                        size="sm"
                        title={job.invoiceStatus === 'RECEIVED' ? "Mark as Not Received" : "Mark as Received"}
                        onClick={async () => {
                          try {
                            await updateJob({ 
                              variables: { 
                                input: { id: job.id, invoiceStatus: job.invoiceStatus === 'RECEIVED' ? 'PENDING' : 'RECEIVED' } 
                              } 
                            })
                            toast({
                              title: "Success",
                              description: job.invoiceStatus === 'RECEIVED' ? "Job marked as not received." : "Job marked as received.",
                            })
                            onJobSuccess()
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: `Failed to update job: ${error.message}`,
                              variant: "destructive"
                            })
                          }
                        }}
                      >
                        <Check className={`h-4 w-4 ${job.invoiceStatus === 'RECEIVED' ? 'text-green-600' : 'text-gray-400'}`} />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        title={job.driverPaid ? "Mark Driver as Unpaid" : "Mark Driver as Paid"}
                        onClick={async () => {
                          try {
                            await updateJob({ 
                              variables: { 
                                input: { id: job.id, driverPaid: !job.driverPaid } 
                              } 
                            })
                            toast({
                              title: "Success",
                              description: job.driverPaid ? "Driver marked as unpaid." : "Driver marked as paid.",
                            })
                            onJobSuccess()
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: `Failed to update job: ${error.message}`,
                              variant: "destructive"
                            })
                          }
                        }}
                      >
                        <User className={`h-4 w-4 ${job.driverPaid ? 'text-green-600' : 'text-gray-400'}`} />
                      </Button>

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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Jobs for selected month summary */}
      {monthJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Jobs in {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</CardTitle>
            <CardDescription>{monthJobs.length} job(s) scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthJobs.slice(0, 5).map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(job).replace('bg-', 'bg-').replace(' text-', '')}`} />
                    <div>
                      <div className="text-sm font-medium">
                        {formatDateForDisplay(job.jobDate, 'MMM d, yyyy')} - {job.jobType?.title || 'Unknown Job'}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {job.driver?.name || 'No driver'}
                        </span>
                        {job.dispatcher && (
                          <span className="flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            {job.dispatcher.name}
                          </span>
                        )}
                        {job.startTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeRange(job.startTime, job.endTime)}
                          </span>
                        )}
                        {job.calculatedAmount && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Amount: ${job.calculatedAmount.toFixed(2)}
                          </span>
                        )}
                        {job.calculatedAmount && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            Commission: ${getCommission(job).toFixed(2)} | After comm: ${getAmountAfterCommission(job).toFixed(2)} | Driver pay: ${getDriverPay(job).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {/* Quick action buttons - independent of each other */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title={job.invoiceStatus === 'RECEIVED' ? "Mark as Not Received" : "Mark as Received"}
                      onClick={async () => {
                        try {
                          await updateJob({ 
                            variables: { 
                              input: { id: job.id, invoiceStatus: job.invoiceStatus === 'RECEIVED' ? 'PENDING' : 'RECEIVED' } 
                            } 
                          })
                          toast({
                            title: "Success",
                            description: job.invoiceStatus === 'RECEIVED' ? "Job marked as not received." : "Job marked as received.",
                          })
                          onJobSuccess()
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: `Failed to update job: ${error.message}`,
                            variant: "destructive"
                          })
                        }
                      }}
                    >
                      <Check className={`h-4 w-4 ${job.invoiceStatus === 'RECEIVED' ? 'text-green-600' : 'text-gray-400'}`} />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title={job.driverPaid ? "Mark Driver as Unpaid" : "Mark Driver as Paid"}
                      onClick={async () => {
                        try {
                          await updateJob({ 
                            variables: { 
                              input: { id: job.id, driverPaid: !job.driverPaid } 
                            } 
                          })
                          toast({
                            title: "Success",
                            description: job.driverPaid ? "Driver marked as unpaid." : "Driver marked as paid.",
                          })
                          onJobSuccess()
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: `Failed to update job: ${error.message}`,
                            variant: "destructive"
                          })
                        }
                      }}
                    >
                      <User className={`h-4 w-4 ${job.driverPaid ? 'text-green-600' : 'text-gray-400'}`} />
                    </Button>

                    <JobDetailModal 
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Job Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      }
                      job={job}
                    />
                    <JobModal 
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Job">
                          <Edit className="h-4 w-4" />
                        </Button>
                      }
                      job={job}
                      onSuccess={onJobSuccess}
                    />
                    {job.jobType && (
                      <JobTypeViewModal
                        trigger={
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0" 
                            title={`Job Type: ${job.jobType.title}`}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        }
                        jobTypeId={job.jobType.id}
                      />
                    )}
                    {job.invoiceStatus && job.invoiceStatus !== 'Not Invoiced' && (
                      <InvoiceViewModal
                        trigger={
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0" 
                            title={`Invoice Status: ${job.invoiceStatus}`}
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        }
                        invoiceId={job.invoice?.id}
                      />
                    )}
                    <ConfirmDeleteDialog
                      title="Delete Job"
                      description="Are you sure you want to delete this job? This action cannot be undone."
                      onConfirm={() => onDeleteJob(job.id)}
                    />
                  </div>
                </div>
              ))}
              {monthJobs.length > 5 && (
                <div className="text-sm text-muted-foreground text-center">
                  And {monthJobs.length - 5} more jobs...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Utility function to check if a job has missing rate
const hasMissingRate = (job: Job): boolean => {
  return !job.jobType?.rateOfJob || job.jobType.rateOfJob <= 0
}

// Row View Component
interface RowViewProps {
  jobs: Job[]
  onJobSuccess: () => void
  onDeleteJob: (jobId: string) => void
}

function RowView({ jobs, onJobSuccess, onDeleteJob }: RowViewProps) {
  const { toast } = useToast()
  const [updateJob] = useMutation(UPDATE_JOB)
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])

  const handleUpdateJobStatus = async (jobId: string, updates: Partial<Job>) => {
    try {
      await updateJob({ 
        variables: { 
          input: { id: jobId, ...updates } 
        } 
      })
      toast({
        title: "Success",
        description: "Job updated successfully.",
      })
      onJobSuccess()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update job: ${error.message}`,
        variant: "destructive"
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const addHST = (amount: number) => amount * 1.13
  
  const getCommission = (job: Job) => {
    const commissionPercent = job?.dispatcher?.commissionPercent ?? 5
    return addHST(job.calculatedAmount || 0) * (commissionPercent / 100)
  }

  const getAmountAfterCommission = (job: Job) => {
    return addHST(job.calculatedAmount || 0) - getCommission(job)
  }

  const getDriverPay = (job: Job) => {
    const hourlyRate = job.driver?.hourlyRate ?? 0
    return getAmountAfterCommission(job) * (hourlyRate / 100)
  }

  const handleJobSelection = (jobId: string, checked: boolean) => {
    setSelectedJobIds(prev => checked ? [...prev, jobId] : prev.filter(id => id !== jobId))
  }

  const handleBatchUpdate = async (changes: Partial<Job>, successMsg: string) => {
    if (selectedJobIds.length === 0) return
    try {
      await Promise.all(selectedJobIds.map(jobId => updateJob({ variables: { input: { id: jobId, ...changes } } })))
      toast({ title: successMsg, description: `${selectedJobIds.length} jobs updated.`, variant: "default" })
      setSelectedJobIds([])
      onJobSuccess()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update jobs.", variant: "destructive" })
    }
  }

  // Calculate totals for selected jobs
  const selectedJobsList = jobs.filter(job => selectedJobIds.includes(job.id))
  const totalBeforeCommission = selectedJobsList.reduce((sum, job) => sum + addHST(job.calculatedAmount || 0), 0)
  const totalCommission = selectedJobsList.reduce((sum, job) => sum + getCommission(job), 0)
  const totalAfterCommission = selectedJobsList.reduce((sum, job) => sum + getAmountAfterCommission(job), 0)
  const totalDriverPay = selectedJobsList.reduce((sum, job) => sum + getDriverPay(job), 0)

  const getJobSpecificValue = (job: Job) => {
    const dispatchType = job.jobType?.dispatchType?.toLowerCase()
    
    switch (dispatchType) {
      case 'hourly':
        return formatTimeRange(job.startTime, job.endTime)
      case 'tonnage':
        const weightDisplay = job.weight && Array.isArray(job.weight) 
          ? job.weight.reduce((sum, w) => sum + (parseFloat(String(w)) || 0), 0).toFixed(1) + ' tons'
          : job.weight 
            ? `${job.weight} tons`
            : 'No weight'
        return weightDisplay
      case 'load':
        return `${job.loads || 0} loads`
      case 'fixed':
        return 'Fixed rate'
      default:
        return formatTimeRange(job.startTime, job.endTime)
    }
  }

  return (
    <div className="space-y-4">
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium w-12">
                    <Checkbox 
                      checked={selectedJobIds.length === jobs.length && jobs.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedJobIds(jobs.map(job => job.id))
                        } else {
                          setSelectedJobIds([])
                        }
                      }}
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Job Type</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-left p-3 font-medium">Driver</th>
                  <th className="text-left p-3 font-medium">Dispatcher</th>
                  <th className="text-left p-3 font-medium">Unit</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Commission</th>
                  <th className="text-left p-3 font-medium">Driver Pay</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-muted-foreground">
                      No jobs found
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr 
                      key={job.id} 
                      className={`border-b hover:bg-muted/20 transition-colors ${
                        hasMissingRate(job) ? 'bg-orange-50 border-orange-200' : ''
                      } ${selectedJobIds.includes(job.id) ? 'bg-primary/10 border-primary/20' : ''}`}
                    >
                      <td className="p-3">
                        <Checkbox 
                          checked={selectedJobIds.includes(job.id)}
                          onCheckedChange={(checked) => handleJobSelection(job.id, checked as boolean)}
                          className="h-4 w-4"
                        />
                      </td>
                      
                      <td className="p-3">
                        <div className="text-sm font-medium">
                          {formatDateForDisplay(job.jobDate, 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateForDisplay(job.jobDate, 'EEE')}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                          >
                            {job.jobType?.dispatchType || 'Unknown'}
                          </Badge>
                          {hasMissingRate(job) && (
                            <AlertTriangle className="h-3 w-3 text-orange-600" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Rate: {job.jobType?.rateOfJob ? `$${job.jobType.rateOfJob}` : 'Not set'}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="text-sm font-medium max-w-[200px] truncate" title={job.jobType?.title || 'Unknown Job'}>
                          {job.jobType?.title || 'Unknown Job'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getJobSpecificValue(job)}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="text-sm">
                          {job.driver?.name || 'None'}
                        </div>
                        {job.driver?.hourlyRate && (
                          <div className="text-xs text-muted-foreground">
                            {job.driver.hourlyRate}% rate
                          </div>
                        )}
                      </td>
                      
                      <td className="p-3">
                        <div className="text-sm">
                          {job.dispatcher?.name || 'None'}
                        </div>
                        {job.dispatcher?.commissionPercent && (
                          <div className="text-xs text-muted-foreground">
                            {job.dispatcher.commissionPercent}% comm.
                          </div>
                        )}
                      </td>
                      
                      <td className="p-3">
                        <div className="text-sm">
                          {job.unit?.name || 'None'}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="text-sm font-medium">
                          {job.calculatedAmount !== undefined 
                            ? formatCurrency(addHST(job.calculatedAmount))
                            : 'Not calculated'
                          }
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="text-sm">
                          {job.calculatedAmount !== undefined 
                            ? formatCurrency(getCommission(job))
                            : '-'
                          }
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="text-sm font-medium">
                          {job.calculatedAmount !== undefined 
                            ? formatCurrency(getDriverPay(job))
                            : '-'
                          }
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <Badge 
                            className={
                              job.invoiceStatus === 'RECEIVED' && job.driverPaid
                                ? "bg-green-100 text-green-800"
                                : job.invoiceStatus === 'RECEIVED'
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                            variant="secondary"
                          >
                            {job.invoiceStatus === "RECEIVED" && job.driverPaid ? "Completed"
                              : job.invoiceStatus === "RECEIVED" ? "Received"
                              : "Pending"}
                          </Badge>
                          {job.invoiceStatus === 'RECEIVED' && !job.driverPaid && (
                            <div className="text-xs text-muted-foreground">
                              Driver not paid
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {/* Quick action buttons - independent of each other */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title={job.invoiceStatus === 'RECEIVED' ? "Mark as Not Received" : "Mark as Received"}
                            onClick={() => handleUpdateJobStatus(job.id, { 
                              invoiceStatus: job.invoiceStatus === 'RECEIVED' ? 'PENDING' : 'RECEIVED' 
                            })}
                          >
                            <Check className={`h-3 w-3 ${job.invoiceStatus === 'RECEIVED' ? 'text-green-600' : 'text-gray-400'}`} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title={job.driverPaid ? "Mark Driver as Unpaid" : "Mark Driver as Paid"}
                            onClick={() => handleUpdateJobStatus(job.id, { driverPaid: !job.driverPaid })}
                          >
                            <User className={`h-3 w-3 ${job.driverPaid ? 'text-green-600' : 'text-gray-400'}`} />
                          </Button>

                          {/* View/Edit buttons */}
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function Jobs() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeView, setActiveView] = useState("list")
  const [currentDate, setCurrentDate] = useState(new Date())
  const { toast } = useToast()
  
  const { data, loading, error, refetch } = useQuery(GET_JOBS, {
    variables: {
      pagination: { 
        page: 1, 
        limit: 1000, // Get all jobs for calendar view and dropdowns
        offset: 0
      }
    },
    fetchPolicy: 'cache-and-network', // Ensure fresh data is fetched
    errorPolicy: 'all'
  })

  const [deleteJob] = useMutation(DELETE_JOB, {
    onCompleted: () => {
      toast({
        title: "Job deleted",
        description: "Job has been deleted successfully.",
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete job: ${error.message}`,
        variant: "destructive"
      })
    },
  })

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteJob({ variables: { id: jobId } })
    } catch (error) {
      console.error('Error deleting job:', error)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading jobs...</div>
  if (error) return <div className="flex items-center justify-center h-64 text-destructive">Error loading jobs: {error.message}</div>

  const jobs: Job[] = data?.jobs?.nodes || []
  const filteredJobs = jobs.filter((job: Job) => {
    const searchLower = searchTerm.toLowerCase();
    
    // Check job date
    if (job.jobDate?.toLowerCase().includes(searchLower)) return true;
    
    // Check weight (handle array format)
    if (job.weight && Array.isArray(job.weight)) {
      if (job.weight.some(w => w.toString().includes(searchLower))) return true;
    }
    
    // Check other fields
    if (job.jobType?.title?.toLowerCase().includes(searchLower)) return true;
    if (job.driver?.name?.toLowerCase().includes(searchLower)) return true;
    if (job.dispatcher?.name?.toLowerCase().includes(searchLower)) return true;
    
    return false;
  })

  // Group jobs by month-year for list view
  const groupJobsByMonth = (jobList: Job[]) => {
    const groups: { [key: string]: Job[] } = {}
    
    jobList.forEach(job => {
      if (job.jobDate) {
        const date = parseBackendDate(job.jobDate)
        if (date) {
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
          const dateA = parseBackendDate(a.jobDate)
          const dateB = parseBackendDate(b.jobDate)
          if (!dateA || !dateB) return 0
          return dateB.getTime() - dateA.getTime()
        })
      })

    return sortedGroups
  }

  const groupedJobs = groupJobsByMonth(filteredJobs)

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const handleSuccess = () => {
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Jobs</h1>
          <p className="text-muted-foreground">Manage delivery jobs and track their progress.</p>
        </div>
        <JobModal 
          trigger={
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          }
          onSuccess={() => refetch()}
        />
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by date, weight, type, driver, dispatcher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Tabs value={activeView} onValueChange={setActiveView} className="w-auto">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="row" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Row View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsContent value="list" className="space-y-6">
          {Object.keys(groupedJobs).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No jobs found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No jobs match your search criteria." : "No jobs have been created yet."}
                </p>
                <JobModal 
                  trigger={
                    <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Job
                    </Button>
                  }
                  onSuccess={() => refetch()}
                />
              </CardContent>
            </Card>
          ) : (
            <JobList 
              jobs={filteredJobs} 
              onJobSuccess={handleSuccess} 
              onDeleteJob={handleDeleteJob} 
            />
          )}
        </TabsContent>
        <TabsContent value="calendar" className="space-y-6">
          <CalendarView 
            jobs={filteredJobs}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onJobSuccess={handleSuccess}
            onDeleteJob={handleDeleteJob}
          />
        </TabsContent>
        <TabsContent value="row" className="space-y-6">
          <RowView 
            jobs={filteredJobs}
            onJobSuccess={handleSuccess}
            onDeleteJob={handleDeleteJob}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}