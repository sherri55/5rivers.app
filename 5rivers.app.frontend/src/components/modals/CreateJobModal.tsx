import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useMutation } from "@apollo/client"
import { GET_JOB_TYPES } from "@/lib/graphql/jobTypes"
import { GET_DRIVERS } from "@/lib/graphql/drivers"
import { GET_DISPATCHERS } from "@/lib/graphql/dispatchers"
import { CREATE_JOB, GET_JOBS } from "@/lib/graphql/jobs"
import { X, Plus } from "lucide-react"

interface CreateJobModalProps {
  trigger: React.ReactNode
  onSuccess?: () => void
}

export const CreateJobModal = ({ trigger, onSuccess }: CreateJobModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  
  // GraphQL queries for form data
  const { data: jobTypesData } = useQuery(GET_JOB_TYPES, {
    variables: { pagination: { limit: 1000 } }
  })
  const { data: driversData } = useQuery(GET_DRIVERS, {
    variables: { pagination: { limit: 1000 } }
  })
  const { data: dispatchersData } = useQuery(GET_DISPATCHERS, {
    variables: { pagination: { limit: 1000 } }
  })
  
  // GraphQL mutation for creating job
  const [createJob, { loading: creating }] = useMutation(CREATE_JOB, {
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
        // If cache update fails, that's okay - the refetch will handle it
      }
    },
    onCompleted: (data) => {
      toast({
        title: "Job Created",
        description: `Job ${data.createJob.id} has been created successfully.`,
      })
      setOpen(false)
      setFormData({
          jobTypeId: "",
          driverId: "",
          dispatcherId: "",
          jobDate: "",
          startTime: "",
          endTime: "",
          weight: [""],
          loads: "",
          jobGrossAmount: "",
          ticketIds: [],
          imageUrls: ""
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
    jobTypeId: "",
    driverId: "",
    dispatcherId: "",
    jobDate: "",
    startTime: "",
    endTime: "",
    weight: [""],
    loads: "",
    jobGrossAmount: "",
    ticketIds: [] as string[],
    imageUrls: ""
  })

  const jobTypes = jobTypesData?.jobTypes || []
  const drivers = driversData?.drivers || []
  const dispatchers = dispatchersData?.dispatchers || []
  
  // Get selected job type details for conditional field display
  const selectedJobType = jobTypes.find((jt: any) => jt.id === formData.jobTypeId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields based on job type
    if (!formData.jobTypeId) {
      toast({
        title: "Validation Error",
        description: "Please select a job type",
        variant: "destructive"
      })
      return
    }

    if (!formData.jobDate) {
      toast({
        title: "Validation Error", 
        description: "Please select a job date",
        variant: "destructive"
      })
      return
    }

    const selectedJobType = jobTypes.find((jt: any) => jt.id === formData.jobTypeId)
    
    // Validate conditional fields
    if (selectedJobType?.dispatchType?.toLowerCase() === "hourly") {
      if (!formData.startTime || !formData.endTime) {
        toast({
          title: "Validation Error",
          description: "Start time and end time are required for hourly jobs",
          variant: "destructive"
        })
        return
      }
    } else if (selectedJobType?.dispatchType?.toLowerCase() === "load") {
      if (!formData.loads || parseInt(formData.loads) < 1) {
        toast({
          title: "Validation Error",
          description: "Number of loads is required for load-based jobs",
          variant: "destructive"
        })
        return
      }
    } else if (selectedJobType?.dispatchType?.toLowerCase() === "tonnage") {
      const validWeight = formData.weight[0] && formData.weight[0].trim() !== "" && parseFloat(formData.weight[0]) > 0
      if (!validWeight) {
        toast({
          title: "Validation Error",
          description: "Weight is required for tonnage-based jobs",
          variant: "destructive"
        })
        return
      }
    }
    
    // Build job input with proper type handling
    const jobInput: any = {
      jobDate: formData.jobDate,
      jobTypeId: formData.jobTypeId || undefined,
      driverId: formData.driverId || undefined,
      dispatcherId: formData.dispatcherId || undefined,
      ticketIds: formData.ticketIds.length > 0 ? formData.ticketIds : undefined,
      imageUrls: formData.imageUrls.trim() || undefined
    }

    // Only include relevant fields based on dispatch type
    if (selectedJobType?.dispatchType?.toLowerCase() === "hourly") {
      jobInput.startTime = formData.startTime
      jobInput.endTime = formData.endTime
    } else if (selectedJobType?.dispatchType?.toLowerCase() === "load") {
      jobInput.loads = parseInt(formData.loads)
    } else if (selectedJobType?.dispatchType?.toLowerCase() === "tonnage") {
      // Only include weight if we have valid values
      const validWeights = formData.weight.filter(w => w && w.trim() !== "").map(w => parseFloat(w))
      if (validWeights.length > 0) {
        jobInput.weight = validWeights
      }
    } else if (selectedJobType?.dispatchType?.toLowerCase() === "fixed" && formData.jobGrossAmount) {
      jobInput.jobGrossAmount = parseFloat(formData.jobGrossAmount)
    }
    
    await createJob({ variables: { input: jobInput } })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type *</Label>
            <Select 
              value={formData.jobTypeId || undefined} 
              onValueChange={(value) => {
                setFormData({
                  ...formData, 
                  jobTypeId: value,
                  // Reset conditional fields when job type changes
                  startTime: "",
                  endTime: "",
                  weight: [""],
                  loads: "",
                  jobGrossAmount: ""
                  // Keep ticketIds and imageUrls as they're not job-type specific
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                {jobTypes.map((type: any) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.title} ({type.dispatchType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobDate">Job Date *</Label>
              <Input
                id="jobDate"
                type="date"
                value={formData.jobDate}
                onChange={(e) => setFormData({...formData, jobDate: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatcher">Dispatcher</Label>
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
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driver">Driver</Label>
              <Select value={formData.driverId || undefined} onValueChange={(value) => setFormData({...formData, driverId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver: any) => (
                    <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {/* Empty space for layout balance */}
            </div>
          </div>

          {/* Conditional Fields Based on Job Type */}
          {selectedJobType && (
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">
                Job Details ({selectedJobType.dispatchType})
              </h3>
              
              {/* Show rate information */}
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Rate: ${selectedJobType.rateOfJob || 'Not set'} per {selectedJobType.dispatchType?.toLowerCase()}
                  {selectedJobType.dispatchType?.toLowerCase() === 'fixed' && ' (fixed amount)'}
                </p>
              </div>

              {/* Hourly fields */}
              {selectedJobType.dispatchType?.toLowerCase() === "hourly" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time *</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Load fields */}
              {selectedJobType.dispatchType?.toLowerCase() === "load" && (
                <div className="space-y-2">
                  <Label htmlFor="loads">Number of Loads *</Label>
                  <Input
                    id="loads"
                    type="number"
                    min="1"
                    value={formData.loads}
                    onChange={(e) => setFormData({...formData, loads: e.target.value})}
                    placeholder="Enter number of loads"
                    required
                  />
                </div>
              )}

              {/* Tonnage fields */}
              {selectedJobType.dispatchType?.toLowerCase() === "tonnage" && (
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (tons) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.weight[0] || ""}
                    onChange={(e) => setFormData({...formData, weight: [e.target.value]})}
                    placeholder="Enter weight in tons (e.g., 22.5)"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Note: You can add multiple weights later after creating the job
                  </p>
                </div>
              )}

              {/* Fixed amount fields */}
              {selectedJobType.dispatchType?.toLowerCase() === "fixed" && (
                <div className="space-y-2">
                  <Label htmlFor="amount">Job Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.jobGrossAmount}
                    onChange={(e) => setFormData({...formData, jobGrossAmount: e.target.value})}
                    placeholder={`Default: $${selectedJobType.rateOfJob || '0.00'}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the job type's default rate of ${selectedJobType.rateOfJob || '0.00'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Additional Fields - Always Visible */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground border-t pt-4">
              Additional Information
            </h3>
            
            {/* Ticket IDs Field */}
            <div className="space-y-2">
              <Label htmlFor="ticketIds">Ticket IDs</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1 min-h-[2.5rem] p-2 border rounded-md bg-background">
                  {formData.ticketIds.map((ticketId, index) => (
                    <div key={index} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                      <span>{ticketId}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          const newTicketIds = formData.ticketIds.filter((_, i) => i !== index)
                          setFormData({...formData, ticketIds: newTicketIds})
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="newTicketId"
                    placeholder="Enter ticket ID and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const value = e.currentTarget.value.trim()
                        if (value && !formData.ticketIds.includes(value)) {
                          setFormData({
                            ...formData, 
                            ticketIds: [...formData.ticketIds, value]
                          })
                          e.currentTarget.value = ''
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement
                      const value = input?.value.trim()
                      if (value && !formData.ticketIds.includes(value)) {
                        setFormData({
                          ...formData, 
                          ticketIds: [...formData.ticketIds, value]
                        })
                        input.value = ''
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Add ticket IDs associated with this job. Press Enter or click + to add.
              </p>
            </div>

            {/* Image URLs Field */}
            <div className="space-y-2">
              <Label htmlFor="imageUrls">Image URLs</Label>
              <Input
                id="imageUrls"
                type="url"
                value={formData.imageUrls}
                onChange={(e) => setFormData({...formData, imageUrls: e.target.value})}
                placeholder="https://example.com/image.jpg (comma-separated for multiple)"
              />
              <p className="text-xs text-muted-foreground">
                Add image URLs associated with this job. For multiple images, separate URLs with commas.
              </p>
            </div>
          </div>

          {!selectedJobType && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Please select a job type to see relevant fields for data entry.
              </p>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={creating}>
              {creating ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}