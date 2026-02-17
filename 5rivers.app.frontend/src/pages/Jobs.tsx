import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { SimpleEnhancedSearch, useSimpleEnhancedSearch, type QuickFilter, type SimpleFilters } from "@/components/SimpleEnhancedSearch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Calendar, DollarSign, Truck, User, List, ChevronLeft, ChevronRight, Eye, Edit, FileText, Receipt, Clock, AlertTriangle, Table, Check, X } from "lucide-react"
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
  ticketIds?: string[]
  imageUrls?: string
  images?: string[]
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

// Helper function to get effective invoice status
// If job is PENDING but has an invoice, it should be displayed as RAISED
const getEffectiveInvoiceStatus = (job: Job): string => {
  if (job.invoiceStatus === 'PENDING' && job.invoice?.id) {
    return 'RAISED'
  }
  return job.invoiceStatus
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
    const effectiveStatus = getEffectiveInvoiceStatus(job)
    if (effectiveStatus === 'RECEIVED' && job.driverPaid) return "bg-green-500"
    if (effectiveStatus === 'RECEIVED') return "bg-blue-500"
    if (effectiveStatus === 'RAISED') return "bg-purple-500"
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
                            : (() => {
                                const effectiveStatus = getEffectiveInvoiceStatus(job)
                                if (effectiveStatus === 'RECEIVED' && job.driverPaid) return "bg-green-50 border-green-500 text-green-800"
                                if (effectiveStatus === 'RECEIVED') return "bg-blue-50 border-blue-500 text-blue-800"
                                if (effectiveStatus === 'RAISED') return "bg-purple-50 border-purple-500 text-purple-800"
                                return "bg-yellow-50 border-yellow-500 text-yellow-800"
                              })()
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

                        {(job.ticketIds?.length || job.images?.length || job.imageUrls) && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {job.ticketIds && job.ticketIds.length > 0 && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <FileText className="h-2.5 w-2.5" />
                                <span>{job.ticketIds.length} ticket{job.ticketIds.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                            {((job.images?.length || 0) + (job.imageUrls ? 1 : 0)) > 0 && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Eye className="h-2.5 w-2.5" />
                                <span>{(job.images?.length || 0) + (job.imageUrls ? 1 : 0)} image{((job.images?.length || 0) + (job.imageUrls ? 1 : 0)) !== 1 ? 's' : ''}</span>
                              </div>
                            )}
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
                          {getEffectiveInvoiceStatus(job)}
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

                        {job.ticketIds && job.ticketIds.length > 0 && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            <span>Tickets: {job.ticketIds.join(', ')}</span>
                          </div>
                        )}

                        {((job.images?.length || 0) + (job.imageUrls ? 1 : 0)) > 0 && (
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{(job.images?.length || 0) + (job.imageUrls ? 1 : 0)} image{((job.images?.length || 0) + (job.imageUrls ? 1 : 0)) !== 1 ? 's' : ''}</span>
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
                        title={(() => {
                          const effectiveStatus = getEffectiveInvoiceStatus(job)
                          return effectiveStatus === 'RECEIVED' ? "Mark as Raised" : effectiveStatus === 'RAISED' ? "Mark as Received" : "Mark as Received"
                        })()}
                        onClick={async () => {
                          try {
                            const effectiveStatus = getEffectiveInvoiceStatus(job)
                            let newStatus: string
                            if (effectiveStatus === 'RECEIVED') {
                              newStatus = 'RAISED'
                            } else if (effectiveStatus === 'RAISED') {
                              newStatus = 'RECEIVED'
                            } else {
                              newStatus = 'RECEIVED'
                            }
                            await updateJob({ 
                              variables: { 
                                input: { id: job.id, invoiceStatus: newStatus } 
                              } 
                            })
                            toast({
                              title: "Success",
                              description: `Job status updated to ${newStatus}.`,
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
                        <Check className={`h-4 w-4 ${(() => {
                          const effectiveStatus = getEffectiveInvoiceStatus(job)
                          return effectiveStatus === 'RECEIVED' ? 'text-green-600' : effectiveStatus === 'RAISED' ? 'text-purple-600' : 'text-gray-400'
                        })()}`} />
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
                        {job.ticketIds && job.ticketIds.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {job.ticketIds.length} ticket{job.ticketIds.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {((job.images?.length || 0) + (job.imageUrls ? 1 : 0)) > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {(job.images?.length || 0) + (job.imageUrls ? 1 : 0)} image{((job.images?.length || 0) + (job.imageUrls ? 1 : 0)) !== 1 ? 's' : ''}
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
                      title={(() => {
                        const effectiveStatus = getEffectiveInvoiceStatus(job)
                        return effectiveStatus === 'RECEIVED' ? "Mark as Raised" : effectiveStatus === 'RAISED' ? "Mark as Received" : "Mark as Received"
                      })()}
                      onClick={async () => {
                        try {
                          const effectiveStatus = getEffectiveInvoiceStatus(job)
                          let newStatus: string
                          if (effectiveStatus === 'RECEIVED') {
                            newStatus = 'RAISED'
                          } else if (effectiveStatus === 'RAISED') {
                            newStatus = 'RECEIVED'
                          } else {
                            newStatus = 'RECEIVED'
                          }
                          await updateJob({ 
                            variables: { 
                              input: { id: job.id, invoiceStatus: newStatus } 
                            } 
                          })
                          toast({
                            title: "Success",
                            description: `Job status updated to ${newStatus}.`,
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
                      <Check className={`h-4 w-4 ${(() => {
                        const effectiveStatus = getEffectiveInvoiceStatus(job)
                        return effectiveStatus === 'RECEIVED' ? 'text-green-600' : effectiveStatus === 'RAISED' ? 'text-purple-600' : 'text-gray-400'
                      })()}`} />
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
                    {(() => {
                      const effectiveStatus = getEffectiveInvoiceStatus(job)
                      return effectiveStatus && effectiveStatus !== 'Not Invoiced' && job.invoice?.id && (
                        <InvoiceViewModal
                          trigger={
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0" 
                              title={`Invoice Status: ${effectiveStatus}`}
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                          }
                          invoiceId={job.invoice.id}
                        />
                      )
                    })()}
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
                  <th className="text-left p-3 font-medium">Ticket IDs</th>
                  <th className="text-left p-3 font-medium">Image Count</th>
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
                    <td colSpan={14} className="p-8 text-center text-muted-foreground">
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
                        <div className="text-sm">
                          {job.ticketIds && job.ticketIds.length > 0
                            ? job.ticketIds.join(', ')
                            : 'No tickets'
                          }
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-sm">
                          {(job.images?.length || 0) + (job.imageUrls ? 1 : 0)} images
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
                            className={(() => {
                              const effectiveStatus = getEffectiveInvoiceStatus(job)
                              return effectiveStatus === 'RECEIVED' && job.driverPaid
                                ? "bg-green-100 text-green-800"
                                : effectiveStatus === 'RECEIVED'
                                ? "bg-blue-100 text-blue-800"
                                : effectiveStatus === 'RAISED'
                                ? "bg-purple-100 text-purple-800"
                                : "bg-yellow-100 text-yellow-800"
                            })()}
                            variant="secondary"
                          >
                            {(() => {
                              const effectiveStatus = getEffectiveInvoiceStatus(job)
                              return effectiveStatus === "RECEIVED" && job.driverPaid ? "Completed"
                                : effectiveStatus === "RECEIVED" ? "Received"
                                : effectiveStatus === "RAISED" ? "Raised"
                                : "Pending"
                            })()}
                          </Badge>
                          {(() => {
                            const effectiveStatus = getEffectiveInvoiceStatus(job)
                            return effectiveStatus === 'RECEIVED' && !job.driverPaid && (
                              <div className="text-xs text-muted-foreground">
                                Driver not paid
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {/* Quick action buttons - independent of each other */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title={(() => {
                              const effectiveStatus = getEffectiveInvoiceStatus(job)
                              return effectiveStatus === 'RECEIVED' ? "Mark as Raised" : effectiveStatus === 'RAISED' ? "Mark as Received" : "Mark as Received"
                            })()}
                            onClick={() => {
                              const effectiveStatus = getEffectiveInvoiceStatus(job)
                              let newStatus: string
                              if (effectiveStatus === 'RECEIVED') {
                                newStatus = 'RAISED'
                              } else if (effectiveStatus === 'RAISED') {
                                newStatus = 'RECEIVED'
                              } else {
                                newStatus = 'RECEIVED'
                              }
                              handleUpdateJobStatus(job.id, { invoiceStatus: newStatus })
                            }}
                          >
                            <Check className={`h-3 w-3 ${(() => {
                              const effectiveStatus = getEffectiveInvoiceStatus(job)
                              return effectiveStatus === 'RECEIVED' ? 'text-green-600' : effectiveStatus === 'RAISED' ? 'text-purple-600' : 'text-gray-400'
                            })()}`} />
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
  const [filters, setFilters] = useState<SimpleFilters>({})
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

  // Define search fields for jobs
  const getJobSearchFields = (job: Job): string[] => [
    // Job basic fields
    job.jobDate,
    job.invoiceStatus,
    job.id,
    job.amount?.toString(),
    job.loads?.toString(),
    job.startTime,
    job.endTime,
    job.driverPaid ? 'paid' : 'unpaid',
    job.calculatedAmount?.toString(),

    // Job Type fields
    job.jobType?.title,
    job.jobType?.dispatchType,
    job.jobType?.startLocation,
    job.jobType?.endLocation,
    job.jobType?.rateOfJob?.toString(),
    job.jobType?.company?.name,
    job.jobType?.company?.description,
    job.jobType?.company?.industry,
    job.jobType?.company?.location,

    // Driver fields
    job.driver?.name,
    job.driver?.email,
    job.driver?.hourlyRate?.toString(),

    // Dispatcher fields
    job.dispatcher?.name,
    job.dispatcher?.email,
    job.dispatcher?.commissionPercent?.toString(),

    // Unit fields
    job.unit?.name,
    job.unit?.plateNumber,
    job.unit?.color,

    // Invoice fields
    job.invoice?.invoiceNumber,
    job.invoice?.status,

    // Handle array fields
    ...(job.weight && Array.isArray(job.weight) ? job.weight.map(w => w.toString()) : []),
    ...(job.ticketIds || []),
    ...(job.imageUrls ? [job.imageUrls] : []),
    ...(job.images || [])
  ].filter(Boolean) as string[]

  // Custom filter function for jobs
  const applyJobFilters = (job: Job, filters: SimpleFilters): boolean => {
    if (filters.driverId && job.driver?.id !== filters.driverId) return false;
    if (filters.dispatcherId && job.dispatcher?.id !== filters.dispatcherId) return false;
    if (filters.unitId && job.unit?.id !== filters.unitId) return false;
    if (filters.jobTypeId && job.jobType?.id !== filters.jobTypeId) return false;
    if (filters.companyId && job.jobType?.company?.id !== filters.companyId) return false;
    if (filters.invoiceStatus && getEffectiveInvoiceStatus(job) !== filters.invoiceStatus) return false;
    if (filters.driverPaid !== undefined && job.driverPaid !== filters.driverPaid) return false;
    if (filters.dispatchType && job.jobType?.dispatchType !== filters.dispatchType) return false;

    // Date range filtering
    if (filters.dateFrom || filters.dateTo) {
      const jobDate = parseBackendDate(job.jobDate);
      if (!jobDate) return false;

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (jobDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (jobDate > toDate) return false;
      }
    }

    return true;
  }

  // Quick filter buttons
  const quickFilters: QuickFilter[] = [
    {
      label: 'Pending',
      icon: Clock,
      filterKey: 'invoiceStatus',
      filterValue: 'PENDING'
    },
    {
      label: 'Raised',
      icon: FileText,
      filterKey: 'invoiceStatus',
      filterValue: 'RAISED'
    },
    {
      label: 'Received',
      icon: Check,
      filterKey: 'invoiceStatus',
      filterValue: 'RECEIVED'
    },
    {
      label: 'Unpaid',
      icon: User,
      filterKey: 'driverPaid',
      filterValue: false
    },
    {
      label: 'Paid',
      icon: DollarSign,
      filterKey: 'driverPaid',
      filterValue: true
    }
  ]

  // Use enhanced search hook
  const filteredJobs = useSimpleEnhancedSearch(
    jobs,
    searchTerm,
    filters,
    getJobSearchFields,
    applyJobFilters
  )

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

      {/* Enhanced Search and Filter Section */}
      <div className="flex items-center justify-between">
        <SimpleEnhancedSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          quickFilters={quickFilters}
          searchPlaceholder="Search jobs... Use & for multiple terms (e.g. 'farmer & pending' or 'amritinder & driver & unpaid')"
          className="flex-1"
        >
          {/* Custom filter content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Driver</label>
              <Select
                value={filters.driverId || ""}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  driverId: value || undefined
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Drivers</SelectItem>
                  {Array.from(new Set(jobs.map(job => job.driver).filter(Boolean)))
                    .map(driver => (
                      <SelectItem key={driver!.id} value={driver!.id}>
                        {driver!.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dispatcher</label>
              <Select
                value={filters.dispatcherId || ""}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  dispatcherId: value || undefined
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dispatcher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Dispatchers</SelectItem>
                  {Array.from(new Set(jobs.map(job => job.dispatcher).filter(Boolean)))
                    .map(dispatcher => (
                      <SelectItem key={dispatcher!.id} value={dispatcher!.id}>
                        {dispatcher!.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Unit</label>
              <Select
                value={filters.unitId || ""}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  unitId: value || undefined
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Units</SelectItem>
                  {Array.from(new Set(jobs.map(job => job.unit).filter(Boolean)))
                    .map(unit => (
                      <SelectItem key={unit!.id} value={unit!.id}>
                        {unit!.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dispatch Type</label>
              <Select
                value={filters.dispatchType || ""}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  dispatchType: value || undefined
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {Array.from(new Set(jobs.map(job => job.jobType?.dispatchType).filter(Boolean)))
                    .map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateFrom: e.target.value || undefined
                }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date To</label>
              <Input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateTo: e.target.value || undefined
                }))}
              />
            </div>
          </div>
        </SimpleEnhancedSearch>
        <Tabs value={activeView} onValueChange={setActiveView} className="ml-4">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="row" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Table
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredJobs.length} of {jobs.length} jobs
          {searchTerm && ` for "${searchTerm}"`}
        </span>
        {(searchTerm || Object.keys(filters).some(key => filters[key] != null)) && (
          <span className="text-xs">
            Use & to search multiple terms (e.g. "farmer & pending")
          </span>
        )}
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