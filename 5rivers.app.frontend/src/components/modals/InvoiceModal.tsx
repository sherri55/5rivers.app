import { useState, useEffect } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { GET_INVOICE, CREATE_INVOICE, UPDATE_INVOICE } from "@/lib/graphql/invoices"
import { GET_JOBS, UPDATE_JOB } from "@/lib/graphql/jobs"
import { GET_DISPATCHERS } from "@/lib/graphql/dispatchers"

interface InvoiceModalProps {
  invoice?: any // Optional - if provided, it's an edit modal; if not, it's a create modal
  invoiceId?: string // For edit mode when we need to fetch the invoice
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export const InvoiceModal = ({ invoice, invoiceId, trigger, onSuccess }: InvoiceModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  
  const isEditMode = !!(invoice || invoiceId)
  const actualInvoiceId = invoice?.id || invoiceId
  
  // Get the full invoice data for edit mode
  const { data: invoiceData, loading: invoiceLoading } = useQuery(GET_INVOICE, {
    variables: { id: actualInvoiceId },
    skip: !open || !isEditMode || !actualInvoiceId
  })
  
  const resolvedInvoice = invoice || invoiceData?.invoice
  
  // Get dispatchers for create mode
  const { data: dispatchersData } = useQuery(GET_DISPATCHERS, {
    variables: { pagination: { limit: 1000 } },
    skip: !open || isEditMode
  })
  
  // Get available jobs
  const { data: jobsData, loading: jobsLoading } = useQuery(GET_JOBS, {
    variables: isEditMode ? {
      filters: { 
        dispatcherId: resolvedInvoice?.dispatcher?.id 
      },
      pagination: { page: 1, limit: 1000, offset: 0 }
    } : {
      filters: {
        invoiceStatus: "NOT_INVOICED"
      },
      pagination: { limit: 1000 }
    },
    skip: !open || (isEditMode && !resolvedInvoice?.dispatcher?.id)
  })
  
  const [createInvoice] = useMutation(CREATE_INVOICE)
  const [updateInvoice] = useMutation(UPDATE_INVOICE)
  const [updateJob] = useMutation(UPDATE_JOB)
  
  const allJobs = jobsData?.jobs?.nodes || []
  const dispatchers = dispatchersData?.dispatchers || []
  
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    status: "DRAFT",
    billedTo: "",
    billedEmail: "",
    dispatcherId: "",
    notes: ""
  })
  
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  
  // Initialize form when invoice data loads or modal opens
  useEffect(() => {
    if (open) {
      if (resolvedInvoice) {
        setFormData({
          invoiceNumber: resolvedInvoice.invoiceNumber || "",
          invoiceDate: resolvedInvoice.invoiceDate ? resolvedInvoice.invoiceDate.split('T')[0] : "",
          status: resolvedInvoice.status || "DRAFT",
          billedTo: resolvedInvoice.billedTo || "",
          billedEmail: resolvedInvoice.billedEmail || "",
          dispatcherId: resolvedInvoice.dispatcher?.id || "",
          notes: resolvedInvoice.notes || ""
        })
        
        // Set currently selected jobs
        const currentJobIds = resolvedInvoice.jobs?.map((jobEntry: any) => jobEntry.job.id) || []
        setSelectedJobIds(currentJobIds)
      } else {
        // Reset form for create mode
        setFormData({
          invoiceNumber: "",
          invoiceDate: "",
          status: "DRAFT",
          billedTo: "",
          billedEmail: "",
          dispatcherId: "",
          notes: ""
        })
        setSelectedJobIds([])
      }
    }
  }, [resolvedInvoice, open])
  
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
    if (isEditMode) {
      return allJobs.filter((job: any) => 
        job.invoiceStatus === "NOT_INVOICED" || 
        selectedJobIds.includes(job.id)
      )
    } else {
      return allJobs
    }
  }
  
  const calculateTotal = () => {
    const selectedJobs = allJobs.filter((job: any) => selectedJobIds.includes(job.id))
    return selectedJobs.reduce((total: number, job: any) => {
      return total + (job.calculatedAmount || 0)
    }, 0)
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedJobIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one job for this invoice.",
        variant: "destructive"
      })
      return
    }
    
    try {
      if (isEditMode) {
        // Update invoice
        await updateInvoice({
          variables: {
            input: {
              id: actualInvoiceId,
              ...formData,
              jobIds: selectedJobIds
            }
          }
        })
        
        // Update job statuses for removed jobs
        const originalJobIds = resolvedInvoice?.jobs?.map((jobEntry: any) => jobEntry.job.id) || []
        const removedJobIds = originalJobIds.filter((id: string) => !selectedJobIds.includes(id))
        
        for (const jobId of removedJobIds) {
          await updateJob({
            variables: {
              input: {
                id: jobId,
                invoiceStatus: "NOT_INVOICED"
              }
            }
          })
        }
        
        toast({
          title: "Invoice Updated",
          description: `Invoice ${formData.invoiceNumber} has been updated successfully.`,
        })
      } else {
        // Create invoice
        await createInvoice({
          variables: {
            input: {
              ...formData,
              jobIds: selectedJobIds
            }
          }
        })
        
        toast({
          title: "Invoice Created",
          description: `Invoice ${formData.invoiceNumber} has been created successfully.`,
        })
      }
      
      setOpen(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} invoice`,
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">{isEditMode ? 'Edit' : 'Create Invoice'}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Edit Invoice: ${resolvedInvoice?.invoiceNumber}` : 'Create New Invoice'}</DialogTitle>
        </DialogHeader>
        
        {(invoiceLoading || jobsLoading) && isEditMode ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading invoice data...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Invoice Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                  placeholder="INV-2024-001"
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
              
              <div className="space-y-2">
                <Label htmlFor="billedTo">Billed To *</Label>
                <Input
                  id="billedTo"
                  value={formData.billedTo}
                  onChange={(e) => setFormData({...formData, billedTo: e.target.value})}
                  placeholder="Company Name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="billedEmail">Billed Email</Label>
                <Input
                  id="billedEmail"
                  type="email"
                  value={formData.billedEmail}
                  onChange={(e) => setFormData({...formData, billedEmail: e.target.value})}
                  placeholder="billing@company.com"
                />
              </div>
              
              {!isEditMode && (
                <div className="space-y-2">
                  <Label htmlFor="dispatcherId">Dispatcher</Label>
                  <Select
                    value={formData.dispatcherId}
                    onValueChange={(value) => setFormData({...formData, dispatcherId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select dispatcher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All dispatchers</SelectItem>
                      {dispatchers.map((dispatcher: any) => (
                        <SelectItem key={dispatcher.id} value={dispatcher.id}>
                          {dispatcher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {isEditMode && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
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
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes for this invoice..."
                rows={3}
              />
            </div>
            
            {/* Job Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {isEditMode ? 'Edit Job Selection' : 'Select Jobs to Invoice'}
                </h3>
                <Badge variant="outline">
                  {selectedJobIds.length} job(s) selected
                </Badge>
              </div>
              
              {getAvailableJobs().length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      {isEditMode ? 'No additional jobs available for this dispatcher.' : 'No jobs available for invoicing.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {getAvailableJobs().map((job: any) => (
                    <div key={job.id} className="flex items-center space-x-3 p-3 border rounded hover:bg-muted/50">
                      <Checkbox
                        checked={selectedJobIds.includes(job.id)}
                        onCheckedChange={(checked) => handleJobToggle(job.id, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {job.jobType?.title || 'Unknown Job'} - {new Date(job.jobDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {job.driver?.name} • {job.dispatcher?.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatCurrency(job.calculatedAmount || 0)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {job.invoiceStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedJobIds.length > 0 && (
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Invoice Amount:</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={selectedJobIds.length === 0}>
                {isEditMode ? 'Update Invoice' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
