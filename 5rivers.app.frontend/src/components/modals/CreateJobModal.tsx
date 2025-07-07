import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useMutation } from "@apollo/client"
import { GET_COMPANIES } from "@/lib/graphql/companies"
import { GET_JOB_TYPES } from "@/lib/graphql/jobTypes"
import { GET_DRIVERS } from "@/lib/graphql/drivers"
import { CREATE_JOB } from "@/lib/graphql/jobs"

interface CreateJobModalProps {
  trigger: React.ReactNode
  onSuccess?: () => void
}

export const CreateJobModal = ({ trigger, onSuccess }: CreateJobModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  
  // GraphQL queries for form data
  const { data: companiesData } = useQuery(GET_COMPANIES)
  const { data: jobTypesData } = useQuery(GET_JOB_TYPES)
  const { data: driversData } = useQuery(GET_DRIVERS)
  
  // GraphQL mutation for creating job
  const [createJob, { loading: creating }] = useMutation(CREATE_JOB, {
    onCompleted: (data) => {
      toast({
        title: "Job Created",
        description: `Job ${data.createJob.id} has been created successfully.`,
      })
      setOpen(false)
      setFormData({
        companyId: "",
        jobTypeId: "",
        driverId: "",
        jobDate: "",
        startTime: "",
        endTime: "",
        weight: [""],
        loads: "",
        jobGrossAmount: ""
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
    companyId: "",
    jobTypeId: "",
    driverId: "",
    jobDate: "",
    startTime: "",
    endTime: "",
    weight: [""],
    loads: "",
    jobGrossAmount: ""
  })

  const companies = companiesData?.companies?.nodes || []
  const allJobTypes = jobTypesData?.jobTypes || []
  const drivers = driversData?.drivers || []
  
  // Filter job types based on selected company
  const availableJobTypes = formData.companyId 
    ? allJobTypes.filter((jt: any) => jt.company?.id === formData.companyId)
    : allJobTypes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const jobInput = {
      jobDate: formData.jobDate,
      jobTypeId: formData.jobTypeId || undefined,
      driverId: formData.driverId || undefined,
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
      weight: formData.weight.filter(w => w).map(w => parseFloat(w)),
      loads: formData.loads ? parseInt(formData.loads) : undefined,
      jobGrossAmount: formData.jobGrossAmount ? parseFloat(formData.jobGrossAmount) : undefined
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Select value={formData.companyId || undefined} onValueChange={(value) => setFormData({...formData, companyId: value, jobTypeId: ""})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobType">Job Type *</Label>
              <Select value={formData.jobTypeId || undefined} onValueChange={(value) => setFormData({...formData, jobTypeId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  {availableJobTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>{type.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (tons)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={formData.weight[0] || ""}
                onChange={(e) => setFormData({...formData, weight: [e.target.value]})}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loads">Loads</Label>
              <Input
                id="loads"
                type="number"
                value={formData.loads}
                onChange={(e) => setFormData({...formData, loads: e.target.value})}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Gross Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.jobGrossAmount}
                onChange={(e) => setFormData({...formData, jobGrossAmount: e.target.value})}
                placeholder="2500.00"
              />
            </div>
          </div>
          
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