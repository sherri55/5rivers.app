import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { User, Phone, Mail } from "lucide-react"
import { useMutation } from "@apollo/client"
import { CREATE_DRIVER, UPDATE_DRIVER } from "@/lib/graphql/drivers"
import { toast } from "@/hooks/use-toast"

interface DriverModalProps {
  driver?: any // Optional - if provided, it's an edit modal; if not, it's a create modal
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function DriverModal({ driver, trigger, onSuccess }: DriverModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isEditMode = !!driver
  
  const [formData, setFormData] = useState({
    name: driver?.name || "",
    description: driver?.description || "",
    email: driver?.email || "",
    phone: driver?.phone || "",
    hourlyRate: driver?.hourlyRate || 0,
  })

  const [createDriver, { loading: creating }] = useMutation(CREATE_DRIVER)
  const [updateDriver, { loading: updating }] = useMutation(UPDATE_DRIVER)
  
  const loading = creating || updating

  // Reset form when driver changes or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (driver) {
        setFormData({
          name: driver.name || "",
          description: driver.description || "",
          email: driver.email || "",
          phone: driver.phone || "",
          hourlyRate: driver.hourlyRate || 0,
        })
      } else {
        // Reset form for create mode
        setFormData({
          name: "",
          description: "",
          email: "",
          phone: "",
          hourlyRate: 0,
        })
      }
    }
  }, [driver, isOpen])

  const handleSave = async () => {
    try {
      if (isEditMode) {
        await updateDriver({
          variables: {
            input: {
              id: driver.id,
              ...formData
            }
          }
        })
        
        toast({
          title: "Success",
          description: "Driver updated successfully",
        })
      } else {
        await createDriver({
          variables: {
            input: {
              name: formData.name,
              description: formData.description || null,
              email: formData.email,
              phone: formData.phone || null,
              hourlyRate: parseFloat(formData.hourlyRate.toString())
            }
          }
        })
        
        toast({
          title: "Driver Created",
          description: `${formData.name} has been added successfully.`,
        })
      }
      
      setIsOpen(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} driver`,
        variant: "destructive",
      })
      console.error("Error saving driver:", error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSave()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">{isEditMode ? 'Edit' : 'Add Driver'}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5 text-primary" />
            {isEditMode ? 'Edit Driver Information' : 'Add New Driver'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Driver Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Driver name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="driver@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              min="0"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({...formData, hourlyRate: parseFloat(e.target.value) || 0})}
              placeholder="25.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description/Notes</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Additional notes about the driver..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : (isEditMode ? 'Save Changes' : 'Add Driver')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
