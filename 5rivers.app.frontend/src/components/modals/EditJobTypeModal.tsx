import { useState } from "react"
import { useMutation, useQuery } from "@apollo/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Briefcase, DollarSign, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { UPDATE_JOB_TYPE } from "@/lib/graphql/jobTypes"
import { GET_COMPANIES } from "@/lib/graphql/companies"

interface EditJobTypeModalProps {
  trigger: React.ReactNode
  jobType: {
    id: string
    title: string
    startLocation?: string
    endLocation?: string
    dispatchType: string
    rateOfJob: number
    company?: {
      id: string
      name: string
    }
  }
  onSuccess?: () => void
}

export const EditJobTypeModal = ({ trigger, jobType, onSuccess }: EditJobTypeModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: jobType.title,
    startLocation: jobType.startLocation || "",
    endLocation: jobType.endLocation || "",
    dispatchType: jobType.dispatchType,
    rateOfJob: jobType.rateOfJob,
    companyId: jobType.company?.id || "none"
  })

  const { data: companiesData, loading: companiesLoading } = useQuery(GET_COMPANIES, {
    variables: {
      pagination: { page: 1, limit: 100, offset: 0 }
    }
  })

  const companies = companiesData?.companies?.nodes || []

  const dispatchTypes = [
    "Hourly",
    "Load", 
    "Tonnage",
    "Fixed"
  ]

  const [updateJobType, { loading }] = useMutation(UPDATE_JOB_TYPE, {
    onCompleted: () => {
      toast({
        title: "Success",
        description: "Job type updated successfully.",
      })
      setOpen(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateJobType({
      variables: {
        input: {
          id: jobType.id,
          title: formData.title,
          startLocation: formData.startLocation || null,
          endLocation: formData.endLocation || null,
          dispatchType: formData.dispatchType,
          rateOfJob: formData.rateOfJob,
          companyId: formData.companyId === "none" ? null : formData.companyId
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Edit Job Type
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Type Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Job type title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Select value={formData.companyId} onValueChange={(value) => setFormData({...formData, companyId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No company</SelectItem>
                {companiesLoading ? (
                  <div className="px-2 py-1 text-sm text-muted-foreground">Loading companies...</div>
                ) : companies.length === 0 ? (
                  <div className="px-2 py-1 text-sm text-muted-foreground">No companies available</div>
                ) : (
                  companies.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dispatchType">Dispatch Type *</Label>
              <Select value={formData.dispatchType || undefined} onValueChange={(value) => setFormData({...formData, dispatchType: value})} required>
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
            <div className="space-y-2">
              <Label htmlFor="rateOfJob">Rate *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="rateOfJob"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-10"
                  value={formData.rateOfJob}
                  onChange={(e) => setFormData({...formData, rateOfJob: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startLocation">Start Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="startLocation"
                  className="pl-10"
                  value={formData.startLocation}
                  onChange={(e) => setFormData({...formData, startLocation: e.target.value})}
                  placeholder="Starting location"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endLocation">End Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="endLocation"
                  className="pl-10"
                  value={formData.endLocation}
                  onChange={(e) => setFormData({...formData, endLocation: e.target.value})}
                  placeholder="Ending location"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Updating..." : "Update Job Type"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}