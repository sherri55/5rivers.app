import { useState, useEffect } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { GET_INVOICE, UPDATE_INVOICE } from "@/lib/graphql/invoices"
import { GET_JOBS, UPDATE_JOB } from "@/lib/graphql/jobs"

interface EditInvoiceModalProps {
  trigger: React.ReactNode
  invoiceId: string
  onSuccess?: () => void
}

export const EditInvoiceModal = ({ trigger, invoiceId, onSuccess }: EditInvoiceModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  
  // Get the full invoice data
  const { data: invoiceData, loading: invoiceLoading } = useQuery(GET_INVOICE, {
    variables: { id: invoiceId },
    skip: !open
  })
  
  const invoice = invoiceData?.invoice
  
  // Get available jobs that can be added to invoices (filtered by dispatcher)
  const { data: jobsData, loading: jobsLoading } = useQuery(GET_JOBS, {
    variables: {
      filters: { 
        dispatcherId: invoice?.dispatcher?.id 
      },
      pagination: { page: 1, limit: 100, offset: 0 }
    },
    skip: !open || !invoice?.dispatcher?.id
  })
  
  const [updateInvoice] = useMutation(UPDATE_INVOICE)
  const [updateJob] = useMutation(UPDATE_JOB)
  
  const allJobs = jobsData?.jobs?.nodes || []
  
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    status: "DRAFT",
    billedTo: "",
    billedEmail: "",
  })
  
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  
  // Initialize form when invoice data loads
  useEffect(() => {
    if (invoice) {
      setFormData({
        invoiceNumber: invoice.invoiceNumber || "",
        invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.split('T')[0] : "",
        status: invoice.status || "DRAFT",
        billedTo: invoice.billedTo || "",
        billedEmail: invoice.billedEmail || "",
      })
      
      // Set currently selected jobs
      const currentJobIds = invoice.jobs?.map((jobEntry: any) => jobEntry.job.id) || []
      setSelectedJobIds(currentJobIds)
    }
  }, [invoice])
  
  const statuses = [
    { value: "DRAFT", label: "Draft" },
    { value: "SENT", label: "Sent" },
    { value: "PAID", label: "Paid" },
    { value: "PENDING", label: "Pending" },
    { value: "OVERDUE", label: "Overdue" }
  ]
  
  const handleJobToggle = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobIds([...selectedJobIds, jobId])
    } else {
      setSelectedJobIds(selectedJobIds.filter(id => id !== jobId))
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  const getAvailableJobs = () => {
    return allJobs.filter((job: any) => 
      job.invoiceStatus !== 'INVOICED' || selectedJobIds.includes(job.id)
    )
  }
  
  const getCurrentJobs = () => {
    return allJobs.filter((job: any) => selectedJobIds.includes(job.id))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Update invoice basic info
      await updateInvoice({
        variables: {
          input: {
            id: invoiceId,
            invoiceNumber: formData.invoiceNumber,
            invoiceDate: formData.invoiceDate,
            status: formData.status,
            billedTo: formData.billedTo,
            billedEmail: formData.billedEmail,
          }
        }
      })
      
      // Handle job changes - this is a simplified approach
      // In a real implementation, you'd want specific mutations for managing invoice-job relationships
      const currentJobIds: string[] = invoice?.jobs?.map((jobEntry: any) => jobEntry.job.id) || []
      const jobsToAdd = selectedJobIds.filter((id: string) => !currentJobIds.includes(id))
      const jobsToRemove = currentJobIds.filter((id: string) => !selectedJobIds.includes(id))
      
      // Update job invoice status for added/removed jobs
      for (const jobId of jobsToAdd) {
        try {
          await updateJob({
            variables: {
              input: {
                id: jobId,
                invoiceStatus: 'INVOICED'
              }
            }
          })
        } catch (error) {
          console.error(`Failed to add job ${jobId} to invoice:`, error)
        }
      }
      
      for (const jobId of jobsToRemove) {
        try {
          await updateJob({
            variables: {
              input: {
                id: jobId,
                invoiceStatus: 'PENDING'
              }
            }
          })
        } catch (error) {
          console.error(`Failed to remove job ${jobId} from invoice:`, error)
        }
      }
      
      toast({
        title: "Invoice Updated",
        description: `Invoice has been successfully updated with ${selectedJobIds.length} jobs.`,
      })
      
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update invoice.",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>
        
        {invoiceLoading ? (
          <div className="p-8 text-center">Loading invoice data...</div>
        ) : (
          <div className="max-h-[calc(90vh-8rem)] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6 p-1">
            {/* Basic Invoice Information */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceDate">Invoice Date *</Label>
                    <Input
                      id="invoiceDate"
                      type="date"
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billedTo">Billed To</Label>
                    <Input
                      id="billedTo"
                      value={formData.billedTo}
                      onChange={(e) => setFormData({...formData, billedTo: e.target.value})}
                      placeholder="Client name or company"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billedEmail">Billed Email</Label>
                    <Input
                      id="billedEmail"
                      type="email"
                      value={formData.billedEmail}
                      onChange={(e) => setFormData({...formData, billedEmail: e.target.value})}
                      placeholder="client@example.com"
                    />
                  </div>
                </div>
                
                {/* Dispatcher Information */}
                {invoice?.dispatcher && (
                  <div className="p-3 bg-muted/20 rounded border">
                    <Label className="text-sm font-medium">Assigned Dispatcher</Label>
                    <div className="mt-1 text-sm">
                      <span className="font-medium">{invoice.dispatcher.name}</span>
                      <span className="text-muted-foreground ml-2">({invoice.dispatcher.email})</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Jobs in this invoice are filtered to this dispatcher
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Current Jobs in Invoice */}
            {invoice?.jobs && invoice.jobs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Jobs in Invoice ({invoice.jobs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {invoice.jobs.map((jobEntry: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded bg-muted/20">
                        <div className="flex-1">
                          <div className="font-medium">{jobEntry.job?.jobType?.title || 'Unknown Job'}</div>
                          <div className="text-sm text-muted-foreground">
                            Date: {jobEntry.job?.jobDate || 'No date'} | 
                            Driver: {jobEntry.job?.driver?.name || 'N/A'} |
                            Unit: {jobEntry.job?.unit?.name || 'N/A'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-primary">
                            {formatCurrency(jobEntry.job?.calculatedAmount || jobEntry.amount || 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total Amount:</span>
                      <span className="text-primary">
                        {invoice.calculations ? formatCurrency(invoice.calculations.total || 0) : '$0.00'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Job Selection */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Manage Jobs in Invoice
                  {invoice?.dispatcher && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (for {invoice.dispatcher.name})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!invoice?.dispatcher ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No dispatcher assigned to this invoice
                  </div>
                ) : jobsLoading ? (
                  <div className="text-center py-4">Loading available jobs...</div>
                ) : (
                  <div className="space-y-2">
                    <Label>Select Jobs to Include in Invoice</Label>
                    <div className="text-sm text-muted-foreground mb-2">
                      Showing jobs managed by {invoice.dispatcher.name}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-3">
                      {getAvailableJobs().map((job: any) => (
                        <div key={job.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                          <Checkbox
                            id={`job-${job.id}`}
                            checked={selectedJobIds.includes(job.id)}
                            onCheckedChange={(checked) => handleJobToggle(job.id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{job.jobType?.title || 'Unknown Job'}</div>
                            <div className="text-sm text-muted-foreground">
                              {job.jobDate} | Driver: {job.driver?.name || 'N/A'} | 
                              Status: <Badge variant="outline">{job.invoiceStatus}</Badge>
                            </div>
                          </div>
                          <div className="text-sm font-medium text-primary">
                            {formatCurrency(job.calculatedAmount || 0)}
                          </div>
                        </div>
                      ))}
                      
                      {getAvailableJobs().length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          No available jobs for {invoice.dispatcher.name}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Selected: {selectedJobIds.length} jobs
                      {selectedJobIds.length > 0 && (
                        <span className="ml-2 font-medium">
                          (Total: {formatCurrency(
                            getCurrentJobs().reduce((sum: number, job: any) => sum + (job.calculatedAmount || 0), 0)
                          )})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Update Invoice
              </Button>
            </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}