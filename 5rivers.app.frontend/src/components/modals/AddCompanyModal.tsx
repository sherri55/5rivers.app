import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useMutation } from "@apollo/client"
import { CREATE_COMPANY } from "@/lib/graphql/companies"

interface AddCompanyModalProps {
  trigger: React.ReactNode
  onSuccess?: () => void
}

export const AddCompanyModal = ({ trigger, onSuccess }: AddCompanyModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [createCompany, { loading }] = useMutation(CREATE_COMPANY)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    industry: "",
    location: "",
    size: "",
    founded: "",
    logo: "",
    email: "",
    phone: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createCompany({
        variables: {
          input: {
            name: formData.name,
            description: formData.description || null,
            website: formData.website || null,
            industry: formData.industry || null,
            location: formData.location || null,
            size: formData.size || null,
            founded: formData.founded ? parseInt(formData.founded) : null,
            logo: formData.logo || null,
            email: formData.email || null,
            phone: formData.phone || null
          }
        }
      })
      
      toast({
        title: "Company Created",
        description: `${formData.name} has been added successfully.`,
      })
      
      setOpen(false)
      setFormData({
        name: "",
        description: "",
        website: "",
        industry: "",
        location: "",
        size: "",
        founded: "",
        logo: "",
        email: "",
        phone: ""
      })
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create company. Please try again.",
        variant: "destructive"
      })
    }
  }

  const industrySizes = [
    "Startup (1-10)",
    "Small (11-50)",
    "Medium (51-200)",
    "Large (201-1000)",
    "Enterprise (1000+)"
  ]

  const industries = [
    "Transportation",
    "Logistics",
    "Construction",
    "Mining",
    "Agriculture",
    "Manufacturing",
    "Energy",
    "Waste Management",
    "Other"
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={formData.industry || undefined} onValueChange={(value) => setFormData({...formData, industry: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map(industry => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of the company"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="City, Province/State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Company Size</Label>
              <Select value={formData.size || undefined} onValueChange={(value) => setFormData({...formData, size: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {industrySizes.map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="founded">Founded Year</Label>
              <Input
                id="founded"
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={formData.founded}
                onChange={(e) => setFormData({...formData, founded: e.target.value})}
                placeholder="2020"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                placeholder="https://company.com"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="contact@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              id="logo"
              type="url"
              value={formData.logo}
              onChange={(e) => setFormData({...formData, logo: e.target.value})}
              placeholder="https://company.com/logo.png"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Company"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}