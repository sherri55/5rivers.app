import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Input,
} from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { GET_DRIVERS } from "@/lib/graphql/drivers"
import { GET_DISPATCHERS } from "@/lib/graphql/dispatchers"
import { GET_UNITS } from "@/lib/graphql/units"
import { GET_JOB_TYPES } from "@/lib/graphql/jobTypes"
import { UPDATE_JOB } from "@/lib/graphql/jobs"

interface JobEditModalProps {
  job: any
  trigger?: React.ReactNode
  onSuccess?: () => void
}

  // Helper function to format datetime for datetime-local input
  const formatDateTimeLocal = (timeString: string, jobDate?: string) => {
    if (!timeString) return ""
    try {
      // If it's already in the correct format, return as is
      if (timeString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        return timeString
      }
      
      // If it's a full ISO datetime string, convert it
      if (timeString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        return timeString.slice(0, 16) // Remove seconds and timezone
      }
      
      // Handle time-only strings like "07:15:00" or "07:15"
      if (timeString.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
        // Use the job date if available, otherwise use today's date
        const dateToUse = jobDate || new Date().toISOString().slice(0, 10)
        
        // Remove seconds if present (07:15:00 -> 07:15)
        const timeOnly = timeString.substring(0, 5)
        
        return `${dateToUse}T${timeOnly}`
      }
      
      // Try to parse as a full datetime
      const date = new Date(timeString)
      if (isNaN(date.getTime())) return ""
      
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch (error) {
      console.warn('Error formatting datetime:', timeString, error)
      return ""
    }
  }

  // Helper function to format date for date input
  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ""
      // Format as YYYY-MM-DD
      return date.toISOString().slice(0, 10)
    } catch (error) {
      console.warn('Error formatting date:', dateString, error)
      return ""
    }
  }

  // Helper function to update datetime with new date
  const updateDateTimeWithNewDate = (dateTimeString: string, newDate: string) => {
    if (!dateTimeString || !newDate) return dateTimeString
    
    try {
      // Extract time from existing datetime
      const existingDateTime = new Date(dateTimeString)
      if (isNaN(existingDateTime.getTime())) return dateTimeString
      
      const hours = String(existingDateTime.getHours()).padStart(2, '0')
      const minutes = String(existingDateTime.getMinutes()).padStart(2, '0')
      
      return `${newDate}T${hours}:${minutes}`
    } catch (error) {
      return dateTimeString
    }
  }

  // Helper function to calculate duration between two datetime strings
  const calculateDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return "Not calculated"
    
    try {
      const start = new Date(startTime)
      const end = new Date(endTime)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Invalid times"
      
      const diffMs = end.getTime() - start.getTime()
      
      if (diffMs < 0) return "End time is before start time"
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      
      if (hours === 0) return `${minutes} minutes`
      if (minutes === 0) return `${hours} hours`
      
      return `${hours} hours, ${minutes} minutes`
    } catch (error) {
      return "Error calculating duration"
    }
  }

export function JobEditModal({ job, trigger, onSuccess }: JobEditModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    jobDate: formatDate(job?.jobDate || ""),
    jobTypeId: job?.jobType?.id || "none",
    driverId: job?.driver?.id || "none",
    dispatcherId: job?.dispatcher?.id || "none",
    unitId: job?.unit?.id || "none",
    weight: (() => {
      // Handle weight as array or convert from legacy string format
      if (Array.isArray(job?.weight)) {
        return job.weight.join(' '); // Convert array to space-separated string for form input
      } else if (job?.weight && typeof job.weight === 'string') {
        return job.weight; // Keep legacy string format
      } else if (job?.weight && typeof job.weight === 'number') {
        return job.weight.toString(); // Convert single number to string
      }
      return "";
    })(),
    loads: job?.loads || 0,
    startTime: formatDateTimeLocal(job?.startTime || "", job?.jobDate),
    endTime: formatDateTimeLocal(job?.endTime || "", job?.jobDate),
    // amount removed - now calculated automatically
    invoiceStatus: job?.invoiceStatus || "Pending",
    paymentReceived: job?.paymentReceived || false,
    driverPaid: job?.driverPaid || false,
    ticketIds: (() => {
      if (Array.isArray(job?.ticketIds)) {
        return job.ticketIds.flatMap((item: any) => {
          if (typeof item === 'string') {
            return item.split(' ').filter((t: string) => t.trim() !== '')
          }
          return String(item).trim()
        }).filter((t: string) => t).join(' ')
      }
      return job?.ticketIds || ""
    })(),
    imageUrls: job?.imageUrls || "",
  })

  // State for multi-value fields
  const [tonnageValues, setTonnageValues] = useState<string[]>([])
  const [ticketIdValues, setTicketIdValues] = useState<string[]>([])
  const [newTonnageInput, setNewTonnageInput] = useState("")
  const [newTicketIdInput, setNewTicketIdInput] = useState("")

  // Fetch data for dropdowns
  const { data: driversData } = useQuery(GET_DRIVERS, {
    variables: { pagination: { limit: 100 } }
  })
  
  const { data: dispatchersData } = useQuery(GET_DISPATCHERS, {
    variables: { pagination: { limit: 100 } }
  })
  
  const { data: unitsData } = useQuery(GET_UNITS, {
    variables: { pagination: { limit: 100 } }
  })

  const { data: jobTypesData } = useQuery(GET_JOB_TYPES, {
    variables: { pagination: { limit: 100 } }
  })

  // Mutations
  const [updateJob] = useMutation(UPDATE_JOB)

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      setFormData({
        jobDate: formatDate(job.jobDate || ""),
        jobTypeId: job.jobType?.id || "none",
        driverId: job.driver?.id || "none",
        dispatcherId: job.dispatcher?.id || "none",
        unitId: job.unit?.id || "none",
        weight: job.weight || "",
        loads: job.loads || 0,
        startTime: formatDateTimeLocal(job.startTime || "", job.jobDate),
        endTime: formatDateTimeLocal(job.endTime || "", job.jobDate),
        // amount removed - now calculated automatically
        invoiceStatus: job.invoiceStatus || "Pending",
        paymentReceived: job.paymentReceived || false,
        driverPaid: job.driverPaid || false,
        ticketIds: (() => {
          if (Array.isArray(job.ticketIds)) {
            return job.ticketIds.flatMap((item: any) => {
              if (typeof item === 'string') {
                return item.split(' ').filter((t: string) => t.trim() !== '')
              }
              return String(item).trim()
            }).filter((t: string) => t).join(' ')
          }
          return job.ticketIds || ""
        })(),
        imageUrls: job.imageUrls || "",
      })

      // Initialize multi-value arrays
      if (Array.isArray(job.weight)) {
        // New array format
        setTonnageValues(job.weight.map((w: number) => w.toString()));
      } else if (job.weight && typeof job.weight === 'string') {
        // Legacy string format
        const weights = job.weight.split(' ').filter((w: string) => w.trim() !== '');
        setTonnageValues(weights);
      } else if (job.weight && typeof job.weight === 'number') {
        // Single number format
        setTonnageValues([job.weight.toString()]);
      } else {
        setTonnageValues([]);
      }

      // Handle ticket IDs - could be string, array, or null
      if (job.ticketIds) {
        if (Array.isArray(job.ticketIds)) {
          // If it's already an array, flatten it and filter out empty values
          const flatTickets = job.ticketIds.flatMap((item: any) => {
            if (typeof item === 'string') {
              return item.split(' ').filter(t => t.trim() !== '')
            }
            return String(item).trim()
          }).filter((t: string) => t)
          setTicketIdValues(flatTickets)
        } else if (typeof job.ticketIds === 'string') {
          // If it's a string, split by spaces
          const tickets = job.ticketIds.split(' ').filter((t: string) => t.trim() !== '')
          setTicketIdValues(tickets)
        }
      } else {
        setTicketIdValues([])
      }
    }
  }, [job])

  // Helper functions for multi-value fields
  const addTonnageValue = () => {
    if (newTonnageInput.trim() && !isNaN(parseFloat(newTonnageInput))) {
      setTonnageValues(prev => [...prev, newTonnageInput.trim()])
      setNewTonnageInput("")
    }
  }

  const removeTonnageValue = (index: number) => {
    setTonnageValues(prev => prev.filter((_, i) => i !== index))
  }

  const addTicketId = () => {
    if (newTicketIdInput.trim() && !ticketIdValues.includes(newTicketIdInput.trim())) {
      setTicketIdValues(prev => [...prev, newTicketIdInput.trim()])
      setNewTicketIdInput("")
    }
  }

  const removeTicketId = (index: number) => {
    setTicketIdValues(prev => prev.filter((_, i) => i !== index))
  }

  // Get selected job type details for dynamic fields
  const selectedJobType = jobTypesData?.jobTypes?.find((jt: any) => jt.id === formData.jobTypeId)

  const handleSave = async () => {
    try {
      const input: any = {
        id: job.id,
        jobDate: formData.jobDate,
        jobTypeId: formData.jobTypeId !== "none" ? formData.jobTypeId : null,
        driverId: formData.driverId !== "none" ? formData.driverId : null,
        dispatcherId: formData.dispatcherId !== "none" ? formData.dispatcherId : null,
        unitId: formData.unitId !== "none" ? formData.unitId : null,
        invoiceStatus: formData.invoiceStatus,
        paymentReceived: formData.paymentReceived,
        driverPaid: formData.driverPaid,
        ticketIds: ticketIdValues, // Send ticket IDs as array to backend
        imageUrls: formData.imageUrls,
        // Note: amount is calculated automatically, not submitted
      }

      // Add fields based on job type
      if (selectedJobType?.dispatchType?.toLowerCase() === "hourly") {
        // Save full datetime strings instead of time-only
        input.startTime = formData.startTime || null
        input.endTime = formData.endTime || null
      } else if (selectedJobType?.dispatchType?.toLowerCase() === "tonnage") {
        input.weight = tonnageValues.map(v => parseFloat(v) || 0).filter(v => !isNaN(v)) // Send as array of floats
      } else if (selectedJobType?.dispatchType?.toLowerCase() === "load") {
        input.loads = parseInt(formData.loads.toString()) || 0
      }

      await updateJob({
        variables: { input }
      })

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job: {job?.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Job Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobDate">Job Date *</Label>
                <Input
                  id="jobDate"
                  type="date"
                  value={formData.jobDate}
                  onChange={(e) => {
                    const newDate = e.target.value
                    setFormData(prev => ({
                      ...prev,
                      jobDate: newDate,
                      // Update start and end times to use the new date
                      startTime: prev.startTime ? updateDateTimeWithNewDate(prev.startTime, newDate) : prev.startTime,
                      endTime: prev.endTime ? updateDateTimeWithNewDate(prev.endTime, newDate) : prev.endTime
                    }))
                  }}
                />
              </div>

              <div>
                <Label htmlFor="jobType">Job Type *</Label>
                <Select
                  value={formData.jobTypeId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, jobTypeId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No job type assigned</SelectItem>
                    {jobTypesData?.jobTypes?.map((jobType: any) => (
                      <SelectItem key={jobType.id} value={jobType.id}>
                        {jobType.title} ({jobType.dispatchType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dynamic Fields Based on Job Type */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">
              Job Details {selectedJobType ? `(${selectedJobType.dispatchType})` : '(No job type selected)'}
            </h3>
            
            {!selectedJobType && (
              <p className="text-sm text-muted-foreground">
                Please select a job type to see relevant fields
              </p>
            )}
            
            {selectedJobType && selectedJobType.dispatchType?.toLowerCase() === "hourly" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>
                
                {/* Duration calculation helper */}
                {formData.startTime && formData.endTime && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Duration:</strong> {calculateDuration(formData.startTime, formData.endTime)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Tip: End time can be on a different day for overnight or multi-day jobs
                    </p>
                    {(() => {
                      const start = new Date(formData.startTime)
                      const end = new Date(formData.endTime)
                      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                      
                      if (diffHours > 24) {
                        return (
                          <p className="text-xs text-orange-600 mt-1 font-medium">
                            ⚠️ Multi-day job detected ({Math.floor(diffHours / 24)} days, {Math.floor(diffHours % 24)} hours)
                          </p>
                        )
                      } else if (diffHours < 0) {
                        return (
                          <p className="text-xs text-red-600 mt-1 font-medium">
                            ❌ End time is before start time
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>
                )}
              </div>
            )}

            {selectedJobType && selectedJobType.dispatchType?.toLowerCase() === "tonnage" && (
              <div className="space-y-4">
                <Label>Weight Values (tons)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Enter weight (e.g., 22.7)"
                    value={newTonnageInput}
                    onChange={(e) => setNewTonnageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTonnageValue()
                      }
                    }}
                  />
                  <Button type="button" onClick={addTonnageValue} variant="outline">
                    Add
                  </Button>
                </div>
                {tonnageValues.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tonnageValues.map((value, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {value}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeTonnageValue(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedJobType && selectedJobType.dispatchType?.toLowerCase() === "load" && (
              <div>
                <Label htmlFor="loads">Number of Loads *</Label>
                <Input
                  id="loads"
                  type="number"
                  min="0"
                  placeholder="Enter number of loads"
                  value={formData.loads}
                  onChange={(e) => setFormData(prev => ({ ...prev, loads: parseInt(e.target.value) || 0 }))}
                />
              </div>
            )}

            <div>
              <Label htmlFor="amount">
                Job Amount (Calculated)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="Calculated based on job type and data"
                value={job?.amount ? `${Number(job.amount).toFixed(2)}` : '0.00'}
                readOnly
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {selectedJobType ? (
                  <>
                    Job type rate: ${selectedJobType.rateOfJob || 'Not set'} | 
                    Dispatch type: {selectedJobType.dispatchType || 'Unknown'}
                    <br />
                    Amount is calculated automatically based on {
                      selectedJobType.dispatchType?.toLowerCase() === "hourly" ? "hours worked" :
                      selectedJobType.dispatchType?.toLowerCase() === "load" ? "number of loads" :
                      selectedJobType.dispatchType?.toLowerCase() === "tonnage" ? "total weight" :
                      selectedJobType.dispatchType?.toLowerCase() === "fixed" ? "fixed amount" :
                      "job data"
                    }
                  </>
                ) : (
                  "Select a job type to see rate information"
                )}
              </p>
            </div>
          </div>

          {/* Assignments */}
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
                    <SelectItem value="none">No driver assigned</SelectItem>
                    {driversData?.drivers?.map((driver: any) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dispatcher">Dispatcher</Label>
                <Select
                  value={formData.dispatcherId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dispatcherId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dispatcher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No dispatcher assigned</SelectItem>
                    {dispatchersData?.dispatchers?.map((dispatcher: any) => (
                      <SelectItem key={dispatcher.id} value={dispatcher.id}>
                        {dispatcher.name}
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
                    <SelectItem value="none">No unit assigned</SelectItem>
                    {unitsData?.units?.map((unit: any) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Additional Information</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-4">
                <Label>Ticket IDs</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter ticket ID"
                    value={newTicketIdInput}
                    onChange={(e) => setNewTicketIdInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTicketId()
                      }
                    }}
                  />
                  <Button type="button" onClick={addTicketId} variant="outline">
                    Add
                  </Button>
                </div>
                {ticketIdValues.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ticketIdValues.map((value, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {value}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeTicketId(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="imageUrls">Image URLs</Label>
                <Input
                  id="imageUrls"
                  type="text"
                  placeholder="Enter image URLs"
                  value={formData.imageUrls}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrls: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Status and Payment */}
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
