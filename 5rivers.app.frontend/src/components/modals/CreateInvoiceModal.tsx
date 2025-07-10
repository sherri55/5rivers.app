import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useMutation } from "@apollo/client"
import { GET_JOBS } from "@/lib/graphql/jobs"
import { GET_DISPATCHERS } from "@/lib/graphql/dispatchers"
import { CREATE_INVOICE } from "@/lib/graphql/invoices"

interface CreateInvoiceModalProps {
  trigger: React.ReactNode
  onSuccess?: () => void
}

export const CreateInvoiceModal = ({ trigger, onSuccess }: CreateInvoiceModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  
  const { data: jobsData } = useQuery(GET_JOBS, {
    variables: {
      filters: {
        invoiceStatus: "NOT_INVOICED"
      },
      pagination: { limit: 1000 }
    }
  })
  const { data: dispatchersData } = useQuery(GET_DISPATCHERS, {
    variables: { pagination: { limit: 1000 } }
  })
  
  const [createInvoice, { loading: creating }] = useMutation(CREATE_INVOICE, {
    onCompleted: (data) => {
      toast({
        title: "Invoice Created",
        description: `Invoice ${data.createInvoice.invoiceNumber} has been created successfully.`,
      })
      setOpen(false)
      setFormData({
        invoiceNumber: "",
        invoiceDate: "",
        billedTo: "",
        billedEmail: "",
        dispatcherId: "",
        selectedJobIds: [],
        notes: ""
      })
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })
  
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    invoiceDate: "",
    billedTo: "",
    billedEmail: "",
    dispatcherId: "",
    selectedJobIds: [] as string[],
    notes: ""
  })

  const availableJobs = jobsData?.jobs?.nodes || []
  const dispatchers = dispatchersData?.dispatchers || []

  const handleJobSelection = (jobId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        selectedJobIds: [...prev.selectedJobIds, jobId]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        selectedJobIds: prev.selectedJobIds.filter(id => id !== jobId)
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.selectedJobIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one job for this invoice.",
        variant: "destructive"
      })
      return
    }
    
    const invoiceInput = {
      invoiceNumber: formData.invoiceNumber,
      invoiceDate: formData.invoiceDate,
      status: "PENDING",
      billedTo: formData.billedTo || undefined,
      billedEmail: formData.billedEmail || undefined,
      dispatcherId: formData.dispatcherId,
      jobIds: formData.selectedJobIds
    }
    
    await createInvoice({ variables: { input: invoiceInput } })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dispatcher">Dispatcher *</Label>
            <Select value={formData.dispatcherId || undefined} onValueChange={(value) => setFormData({...formData, dispatcherId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select dispatcher" />
              </SelectTrigger>
              <SelectContent>
                {dispatchers.map((dispatcher: any) => (
                  <SelectItem key={dispatcher.id} value={dispatcher.id}>{dispatcher.name}</SelectItem>
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
                placeholder="Company name"
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
          </div>
          
          <div className="space-y-2">
            <Label>Jobs to Include *</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
              {availableJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No uninvoiced jobs available</p>
              ) : (
                availableJobs.map((job: any) => (
                  <div key={job.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`job-${job.id}`}
                      checked={formData.selectedJobIds.includes(job.id)}
                      onCheckedChange={(checked) => handleJobSelection(job.id, checked as boolean)}
                    />
                    <Label htmlFor={`job-${job.id}`} className="text-sm cursor-pointer flex-1">
                      {job.jobDate} - {job.jobType?.title || 'No job type'} 
                      {job.jobType?.company?.name && ` (${job.jobType.company.name})`}
                      - ${job.calculatedAmount?.toFixed(2) || job.amount?.toFixed(2) || '0.00'}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {formData.selectedJobIds.length} job(s)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any additional notes or comments"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={creating}>
              {creating ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
