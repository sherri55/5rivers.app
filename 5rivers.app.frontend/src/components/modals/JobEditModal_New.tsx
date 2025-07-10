import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { GET_DRIVERS } from "@/lib/graphql/drivers"
import { GET_UNITS } from "@/lib/graphql/units"
import { 
  MARK_JOB_PAID, 
  UPDATE_JOB_STATUS, 
  ASSIGN_JOB_TO_DRIVER, 
  ASSIGN_JOB_TO_UNIT 
} from "@/lib/graphql/jobs"

interface JobEditModalProps {
  job: any
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function JobEditModal({ job, trigger, onSuccess }: JobEditModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    invoiceStatus: job?.invoiceStatus || "Pending",
    paymentReceived: job?.paymentReceived || false,
    driverPaid: job?.driverPaid || false,
    driverId: job?.driver?.id || "",
    unitId: job?.unit?.id || "",
  })

  // Fetch data for dropdowns
  const { data: driversData } = useQuery(GET_DRIVERS, {
    variables: { pagination: { limit: 1000 } }
  })
  
  const { data: unitsData } = useQuery(GET_UNITS, {
    variables: { pagination: { limit: 1000 } }
  })

  // Mutations
  const [markJobPaid] = useMutation(MARK_JOB_PAID)
  const [updateJobStatus] = useMutation(UPDATE_JOB_STATUS)
  const [assignJobToDriver] = useMutation(ASSIGN_JOB_TO_DRIVER)
  const [assignJobToUnit] = useMutation(ASSIGN_JOB_TO_UNIT)

  const handleSave = async () => {
    try {
      // Update payment status if changed
      if (formData.paymentReceived !== job?.paymentReceived || formData.driverPaid !== job?.driverPaid) {
        await markJobPaid({
          variables: {
            id: job.id,
            driverPaid: formData.driverPaid,
            paymentReceived: formData.paymentReceived
          }
        })
      }

      // Update invoice status if changed
      if (formData.invoiceStatus !== job?.invoiceStatus) {
        await updateJobStatus({
          variables: {
            id: job.id,
            status: formData.invoiceStatus
          }
        })
      }

      // Assign driver if changed
      if (formData.driverId && formData.driverId !== job?.driver?.id) {
        await assignJobToDriver({
          variables: {
            jobId: job.id,
            driverId: formData.driverId
          }
        })
      }

      // Assign unit if changed
      if (formData.unitId && formData.unitId !== job?.unit?.id) {
        await assignJobToUnit({
          variables: {
            jobId: job.id,
            unitId: formData.unitId
          }
        })
      }

      toast({
        title: "Success",
        description: "Job updated successfully",
      })
      
      setIsOpen(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('Error updating job:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update job",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Edit</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job: {job?.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Read-only Job Information */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-foreground">Job Information (Read-only)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Job Date:</span>
                <span className="ml-2 font-medium">
                  {job?.jobDate ? new Date(job.jobDate).toLocaleDateString() : 'Not set'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Job Type:</span>
                <span className="ml-2 font-medium">{job?.jobType?.title || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Weight:</span>
                <span className="ml-2 font-medium">
                  {(() => {
                    if (Array.isArray(job?.weight)) {
                      const total = job.weight.reduce((sum: number, w: number) => sum + w, 0);
                      return job.weight.length > 1 
                        ? `${job.weight.join(' + ')} = ${total.toFixed(2)} tons`
                        : `${total.toFixed(2)} tons`;
                    } else if (job?.weight) {
                      return `${job.weight} tons`;
                    }
                    return 'Not specified';
                  })()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Loads:</span>
                <span className="ml-2 font-medium">{job?.loads || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Start Time:</span>
                <span className="ml-2 font-medium">{job?.startTime || 'Not set'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">End Time:</span>
                <span className="ml-2 font-medium">{job?.endTime || 'Not set'}</span>
              </div>
            </div>
          </div>

          {/* Editable Assignments */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Assignments</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="driver">Driver</Label>
                <Select
                  value={formData.driverId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, driverId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No driver assigned</SelectItem>
                    {driversData?.drivers?.nodes?.map((driver: any) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unitId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, unitId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No unit assigned</SelectItem>
                    {unitsData?.units?.nodes?.map((unit: any) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Editable Status and Payment */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Status & Payment</h3>
            
            <div>
              <Label htmlFor="invoiceStatus">Invoice Status</Label>
              <Select
                value={formData.invoiceStatus}
                onValueChange={(value) => setFormData(prev => ({ ...prev, invoiceStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Invoiced">Invoiced</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Not Invoiced">Not Invoiced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="paymentReceived"
                checked={formData.paymentReceived}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, paymentReceived: checked }))}
              />
              <Label htmlFor="paymentReceived">Payment Received</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="driverPaid"
                checked={formData.driverPaid}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, driverPaid: checked }))}
              />
              <Label htmlFor="driverPaid">Driver Paid</Label>
            </div>
          </div>

          {/* Calculated Information (Read-only) */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-foreground">Calculated Information (Read-only)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Calculated Amount:</span>
                <span className="ml-2 font-medium">
                  {job?.calculatedAmount ? `$${job.calculatedAmount.toFixed(2)}` : 'Not calculated'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Calculated Hours:</span>
                <span className="ml-2 font-medium">
                  {job?.calculatedHours ? `${job.calculatedHours} hours` : 'Not calculated'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
