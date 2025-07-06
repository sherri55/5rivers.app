import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useMutation, useQuery } from "@apollo/client"
import { CREATE_JOB_TYPE } from "@/lib/graphql/jobTypes"
import { GET_COMPANIES } from "@/lib/graphql/companies"

interface AddJobTypeModalProps {
  trigger: React.ReactNode
  onSuccess?: () => void
}

export const AddJobTypeModal = ({ trigger, onSuccess }: AddJobTypeModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [createJobType, { loading }] = useMutation(CREATE_JOB_TYPE)
  const { data: companiesData } = useQuery(GET_COMPANIES)
  
  const [formData, setFormData] = useState({
    title: "",
    startLocation: "",
    endLocation: "",
    dispatchType: "",
    rateOfJob: "",
    companyId: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createJobType({
        variables: {
          input: {
            title: formData.title,
            startLocation: formData.startLocation || null,
            endLocation: formData.endLocation || null,
            dispatchType: formData.dispatchType,
            rateOfJob: parseFloat(formData.rateOfJob),
            companyId: formData.companyId || null
          }
        }
      })
      
      toast({
        title: "Job Type Created",
        description: `${formData.title} has been added successfully.`,
      })
      
      setOpen(false)
      setFormData({
        title: "",
        startLocation: "",
        endLocation: "",
        dispatchType: "",
        rateOfJob: "",
        companyId: ""
      })
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job type. Please try again.",
        variant: "destructive"
      })
    }
  }

  const dispatchTypes = [
    "Hourly",
    "Load",
    "Tonnage", 
    "Fixed"
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Job Type</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                placeholder="Local Delivery"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatchType">Dispatch Type *</Label>
              <Select value={formData.dispatchType || undefined} onValueChange={(value) => setFormData({...formData, dispatchType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dispatch type" />
                </SelectTrigger>
                <SelectContent>
                  {dispatchTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startLocation">Start Location</Label>
              <Input
                id="startLocation"
                value={formData.startLocation}
                onChange={(e) => setFormData({...formData, startLocation: e.target.value})}
                placeholder="Warehouse A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endLocation">End Location</Label>
              <Input
                id="endLocation"
                value={formData.endLocation}
                onChange={(e) => setFormData({...formData, endLocation: e.target.value})}
                placeholder="Customer Site"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rateOfJob">Rate per Job *</Label>
              <Input
                id="rateOfJob"
                type="number"
                min="0"
                step="0.01"
                value={formData.rateOfJob}
                onChange={(e) => setFormData({...formData, rateOfJob: e.target.value})}
                required
                placeholder="250.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyId">Company</Label>
              <Select value={formData.companyId || undefined} onValueChange={(value) => setFormData({...formData, companyId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companiesData?.companies?.nodes?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Job Type"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
