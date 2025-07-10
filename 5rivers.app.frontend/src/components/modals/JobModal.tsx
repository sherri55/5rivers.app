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
import { X, Upload } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { uploadMultipleImages, validateImageFile, createPreviewUrl } from "@/lib/services/imageUpload"
import { GET_DRIVERS } from "@/lib/graphql/drivers"
import { GET_DISPATCHERS } from "@/lib/graphql/dispatchers"
import { GET_UNITS } from "@/lib/graphql/units"
import { GET_JOB_TYPES } from "@/lib/graphql/jobTypes"
import { CREATE_JOB, UPDATE_JOB, GET_JOBS } from "@/lib/graphql/jobs"

interface JobModalProps {
  job?: any // Optional - if provided, it's an edit modal; if not, it's a create modal
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

// Helper function to calculate amount dynamically
const calculateJobAmount = (jobType: any, formData: any, tonnageValues: string[], ticketIdValues: string[]) => {
  if (!jobType || !jobType.rateOfJob) return 0

  const rate = parseFloat(jobType.rateOfJob) || 0
  const dispatchType = jobType.dispatchType?.toLowerCase()

  switch (dispatchType) {
    case 'hourly':
      if (formData.startTime && formData.endTime) {
        try {
          const start = new Date(formData.startTime)
          const end = new Date(formData.endTime)
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
            const diffMs = end.getTime() - start.getTime()
            const hours = diffMs / (1000 * 60 * 60)
            return hours * rate
          }
        } catch (error) {
          console.warn('Error calculating hourly amount:', error)
        }
      }
      return 0

    case 'tonnage':
      const totalWeight = tonnageValues.reduce((sum, value) => {
        const weight = parseFloat(value) || 0
        return sum + weight
      }, 0)
      return totalWeight * rate

    case 'load':
      const loads = parseInt(formData.loads?.toString()) || 0
      return loads * rate

    case 'ticket':
      const ticketCount = ticketIdValues.length
      return ticketCount * rate

    case 'fixed':
    default:
      return rate
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

export function JobModal({ job, trigger, onSuccess }: JobModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isEditMode = !!job
  
  const [formData, setFormData] = useState({
    jobDate: job ? formatDate(job.jobDate || "") : "",
    jobTypeId: job?.jobType?.id || "none",
    driverId: job?.driver?.id || "none",
    dispatcherId: job?.dispatcher?.id || "none",
    unitId: job?.unit?.id || "none",
    weight: (() => {
      if (!job) return ""
      // Handle weight as array or convert from legacy string format
      if (Array.isArray(job.weight)) {
        return job.weight.join(' '); // Convert array to space-separated string for form input
      } else if (job.weight && typeof job.weight === 'string') {
        return job.weight; // Keep legacy string format
      } else if (job.weight && typeof job.weight === 'number') {
        return job.weight.toString(); // Convert single number to string
      }
      return "";
    })(),
    loads: job?.loads || 0,
    startTime: job ? formatDateTimeLocal(job.startTime || "", job.jobDate) : "",
    endTime: job ? formatDateTimeLocal(job.endTime || "", job.jobDate) : "",
    invoiceStatus: job?.invoiceStatus || "Pending",
    paymentReceived: job?.paymentReceived || false,
    driverPaid: job?.driverPaid || false,
    ticketIds: (() => {
      if (!job) return ""
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
  })

  // State for multi-value fields
  const [tonnageValues, setTonnageValues] = useState<string[]>([])
  const [ticketIdValues, setTicketIdValues] = useState<string[]>([])
  const [newTonnageInput, setNewTonnageInput] = useState("")
  const [newTicketIdInput, setNewTicketIdInput] = useState("")
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([]) // Track existing images separately
  const [isUploading, setIsUploading] = useState(false)
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0)

  // Fetch data for dropdowns
  const { data: driversData } = useQuery(GET_DRIVERS, {
    variables: { pagination: { limit: 1000 } }
  })
  
  const { data: dispatchersData } = useQuery(GET_DISPATCHERS, {
    variables: { pagination: { limit: 1000 } }
  })
  
  const { data: unitsData } = useQuery(GET_UNITS, {
    variables: { pagination: { limit: 1000 } }
  })

  const { data: jobTypesData } = useQuery(GET_JOB_TYPES, {
    variables: { pagination: { limit: 1000 } }
  })

  // Mutations
  const [createJob] = useMutation(CREATE_JOB, {
    update(cache, { data: mutationResult }) {
      // Update the cache to include the new job
      try {
        const existingJobs = cache.readQuery({
          query: GET_JOBS,
          variables: {
            pagination: { page: 1, limit: 1000, offset: 0 }
          }
        }) as any;

        if (existingJobs?.jobs?.nodes && mutationResult?.createJob) {
          cache.writeQuery({
            query: GET_JOBS,
            variables: {
              pagination: { page: 1, limit: 1000, offset: 0 }
            },
            data: {
              jobs: {
                ...existingJobs.jobs,
                nodes: [mutationResult.createJob, ...existingJobs.jobs.nodes],
                totalCount: existingJobs.jobs.totalCount + 1
              }
            }
          });
        }
      } catch (error) {
        console.log('Error updating cache:', error);
      }
    }
  })
  
  const [updateJob] = useMutation(UPDATE_JOB)

  // Get selected job type details for dynamic calculations
  const selectedJobType = jobTypesData?.jobTypes?.find((jt: any) => jt.id === formData.jobTypeId)

  // Effect to calculate amount when relevant fields change
  useEffect(() => {
    if (selectedJobType) {
      const newAmount = calculateJobAmount(selectedJobType, formData, tonnageValues, ticketIdValues)
      setCalculatedAmount(newAmount)
    } else {
      setCalculatedAmount(0)
    }
  }, [selectedJobType, formData.startTime, formData.endTime, formData.loads, tonnageValues, ticketIdValues])

  // Reset form when job changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (job) {
        setFormData({
          jobDate: formatDate(job.jobDate || ""),
          jobTypeId: job.jobType?.id || "none",
          driverId: job.driver?.id || "none",
          dispatcherId: job.dispatcher?.id || "none",
          unitId: job.unit?.id || "none",
          weight: (() => {
            // Handle weight as array or convert from legacy string format
            if (Array.isArray(job.weight)) {
              return job.weight.join(' '); // Convert array to space-separated string for form input
            } else if (job.weight && typeof job.weight === 'string') {
              return job.weight; // Keep legacy string format
            } else if (job.weight && typeof job.weight === 'number') {
              return job.weight.toString(); // Convert single number to string
            }
            return "";
          })(),
          loads: job.loads || 0,
          startTime: formatDateTimeLocal(job.startTime || "", job.jobDate),
          endTime: formatDateTimeLocal(job.endTime || "", job.jobDate),
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

        // Initialize existing images for edit mode
        if (job.images && Array.isArray(job.images)) {
          setExistingImages([...job.images]) // Copy existing images
          setImagePreviewUrls([...job.images]) // Show them in preview
          setUploadedImages([]) // No new files initially
        } else {
          setExistingImages([])
          setImagePreviewUrls([])
          setUploadedImages([])
        }
      } else {
        // Reset form for create mode
        setFormData({
          jobDate: "",
          jobTypeId: "none",
          driverId: "none",
          dispatcherId: "none",
          unitId: "none",
          weight: "",
          loads: 0,
          startTime: "",
          endTime: "",
          invoiceStatus: "Pending",
          paymentReceived: false,
          driverPaid: false,
          ticketIds: "",
        })
        setTonnageValues([])
        setTicketIdValues([])
        setNewTonnageInput("")
        setNewTicketIdInput("")
        setUploadedImages([])
        setImagePreviewUrls([])
        setExistingImages([])
      }
    }
  }, [job, isOpen])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [imagePreviewUrls])

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

  // Helper functions for image handling
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return
    
    const validFiles: File[] = []
    
    Array.from(files).forEach(file => {
      const error = validateImageFile(file, 5) // 5MB limit
      
      if (error) {
        toast({
          title: "Invalid file",
          description: error,
          variant: "destructive"
        })
        return
      }
      
      validFiles.push(file)
    })
    
    if (validFiles.length === 0) return
    
    // Add new files to existing ones
    setUploadedImages(prev => [...prev, ...validFiles])
    
    // Create preview URLs for new files
    validFiles.forEach(file => {
      const previewUrl = createPreviewUrl(file)
      setImagePreviewUrls(prev => [...prev, previewUrl])
    })
  }

  const removeImage = (index: number) => {
    const totalExistingImages = existingImages.length
    
    if (index < totalExistingImages) {
      // Removing an existing image
      setExistingImages(prev => prev.filter((_, i) => i !== index))
    } else {
      // Removing a new uploaded image
      const newImageIndex = index - totalExistingImages
      
      // Revoke the preview URL to prevent memory leaks for newly uploaded files
      const previewUrl = imagePreviewUrls[index]
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      
      setUploadedImages(prev => prev.filter((_, i) => i !== newImageIndex))
    }
    
    // Always update the preview URLs
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImagesToServer = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return []
    
    setIsUploading(true)
    
    try {
      const uploadedUrls = await uploadMultipleImages(files, 'jobs')
      return uploadedUrls
    } catch (error) {
      console.error('Error uploading images:', error)
      toast({
        title: "Upload failed",
        description: "Failed to upload one or more images",
        variant: "destructive"
      })
      return []
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      // First, upload any new images
      let imageUrls: string[] = []
      if (uploadedImages.length > 0) {
        imageUrls = await uploadImagesToServer(uploadedImages)
      }
      
      // Combine existing images (for edit mode) with newly uploaded ones
      const allImages = isEditMode ? 
        [...existingImages, ...imageUrls] : 
        imageUrls

      const input: any = {
        jobDate: formData.jobDate,
        amount: calculatedAmount, // Include the calculated amount
        jobTypeId: formData.jobTypeId !== "none" ? formData.jobTypeId : null,
        driverId: formData.driverId !== "none" ? formData.driverId : null,
        dispatcherId: formData.dispatcherId !== "none" ? formData.dispatcherId : null,
        unitId: formData.unitId !== "none" ? formData.unitId : null,
        invoiceStatus: formData.invoiceStatus,
        paymentReceived: formData.paymentReceived,
        driverPaid: formData.driverPaid,
        ticketIds: ticketIdValues, // Send ticket IDs as array to backend
        images: allImages, // Array of image URLs
      }

      // Add ID for update operation
      if (isEditMode) {
        input.id = job.id
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

      if (isEditMode) {
        await updateJob({
          variables: { input }
        })
        toast({
          title: "Success",
          description: "Job updated successfully",
        })
      } else {
        await createJob({
          variables: { input }
        })
        toast({
          title: "Success",
          description: "Job created successfully",
        })
      }
      
      setIsOpen(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('Error saving job:', error)
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} job`,
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">{isEditMode ? 'Edit' : 'Create Job'}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Edit Job: ${job?.id}` : 'Create New Job'}</DialogTitle>
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
                    setFormData(prev => {
                      const updatedFormData = {
                        ...prev,
                        jobDate: newDate,
                        // Update start and end times to use the new date
                        startTime: prev.startTime ? updateDateTimeWithNewDate(prev.startTime, newDate) : prev.startTime,
                        endTime: prev.endTime ? updateDateTimeWithNewDate(prev.endTime, newDate) : prev.endTime
                      }

                      // For new jobs (not edit mode), set default times when date is selected
                      if (!isEditMode && newDate && !prev.startTime && !prev.endTime) {
                        updatedFormData.startTime = `${newDate}T08:00` // Default start time 8:00 AM
                        updatedFormData.endTime = `${newDate}T17:00`   // Default end time 5:00 PM
                      }

                      return updatedFormData
                    })
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
                value={calculatedAmount.toFixed(2)}
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
                <Label>Job Images</Label>
                <div className="space-y-4">
                  {/* Image Upload Area */}
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e.target.files)}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Upload Images</p>
                        <p className="text-xs text-muted-foreground">
                          Click to upload or drag and drop images (max 5MB each)
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Image Previews */}
                  {(imagePreviewUrls.length > 0 || uploadedImages.length > 0) && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                            <img
                              src={url}
                              alt={`Job image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 right-1 bg-black/50 text-white text-xs p-1 rounded truncate">
                            {uploadedImages[index]?.name || 'Existing image'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Uploading images...
                    </div>
                  )}
                </div>
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

          {/* Calculated Information (Read-only) - Only show in edit mode */}
          {isEditMode && (
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
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEditMode ? 'Save Changes' : 'Create Job'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
