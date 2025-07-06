import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useMutation } from "@apollo/client"
import { CREATE_UNIT } from "@/lib/graphql/units"

interface AddUnitModalProps {
  trigger: React.ReactNode
  onSuccess?: () => void
}

export const AddUnitModal = ({ trigger, onSuccess }: AddUnitModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [createUnit, { loading }] = useMutation(CREATE_UNIT)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "",
    plateNumber: "",
    vin: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createUnit({
        variables: {
          input: {
            name: formData.name,
            description: formData.description || null,
            color: formData.color || null,
            plateNumber: formData.plateNumber || null,
            vin: formData.vin || null
          }
        }
      })
      
      toast({
        title: "Unit Created",
        description: `${formData.name} has been added successfully.`,
      })
      
      setOpen(false)
      setFormData({
        name: "",
        description: "",
        color: "",
        plateNumber: "",
        vin: ""
      })
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create unit. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Unit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Unit Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Truck #001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                placeholder="Red"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plateNumber">Plate Number</Label>
              <Input
                id="plateNumber"
                value={formData.plateNumber}
                onChange={(e) => setFormData({...formData, plateNumber: e.target.value})}
                placeholder="ABC-1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                value={formData.vin}
                onChange={(e) => setFormData({...formData, vin: e.target.value})}
                placeholder="1HGCM82633A004352"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Additional information about the unit"
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Unit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
