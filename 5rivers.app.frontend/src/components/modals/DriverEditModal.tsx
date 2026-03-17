import { useState } from "react"
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
import { UPDATE_DRIVER } from "@/lib/graphql/drivers"
import { toast } from "@/hooks/use-toast"

interface DriverEditModalProps {
  driver: any
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function DriverEditModal({ driver, trigger, onSuccess }: DriverEditModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [updateDriver, { loading }] = useMutation(UPDATE_DRIVER)
  const [formData, setFormData] = useState({
    name: driver?.name || "",
    description: driver?.description || "",
    email: driver?.email || "",
    phone: driver?.phone || "",
    hourlyRate: driver?.hourlyRate || 0,
  })

  const handleSave = async () => {
    try {
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
      
      setIsOpen(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update driver",
        variant: "destructive",
      })
      console.error("Error updating driver:", error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Edit</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5 text-primary" />
            Edit Driver Information
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Driver Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Driver name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="driver@example.com"
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description about the driver..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-gradient-primary hover:bg-primary-hover">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}