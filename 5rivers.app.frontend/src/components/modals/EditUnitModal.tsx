import { useState } from "react"
import { useMutation } from "@apollo/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Truck, Palette, Hash } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { UPDATE_UNIT } from "@/lib/graphql/units"

interface EditUnitModalProps {
  trigger: React.ReactNode
  unit: {
    id: string
    name: string
    description?: string
    color?: string
    plateNumber?: string
    vin?: string
  }
  onSuccess?: () => void
}

export const EditUnitModal = ({ trigger, unit, onSuccess }: EditUnitModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: unit.name,
    description: unit.description || "",
    color: unit.color || "",
    plateNumber: unit.plateNumber || "",
    vin: unit.vin || ""
  })

  const [updateUnit, { loading }] = useMutation(UPDATE_UNIT, {
    onCompleted: () => {
      toast({
        title: "Success",
        description: "Unit updated successfully.",
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
    updateUnit({
      variables: {
        input: {
          id: unit.id,
          name: formData.name,
          description: formData.description || null,
          color: formData.color || null,
          plateNumber: formData.plateNumber || null,
          vin: formData.vin || null
        }
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Edit Unit
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Unit Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Unit name"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plateNumber">Plate Number</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="plateNumber"
                  className="pl-10"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({...formData, plateNumber: e.target.value})}
                  placeholder="ABC-1234"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="relative">
                <Palette className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="color"
                  className="pl-10"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  placeholder="Red, Blue, etc."
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              value={formData.vin}
              onChange={(e) => setFormData({...formData, vin: e.target.value})}
              placeholder="Vehicle Identification Number"
              className="font-mono text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Optional description..."
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Updating..." : "Update Unit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
