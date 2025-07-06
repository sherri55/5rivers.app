import { useState } from "react"
import { useMutation } from "@apollo/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { UPDATE_DISPATCHER } from "@/lib/graphql/dispatchers"

interface EditDispatcherModalProps {
  trigger: React.ReactNode
  dispatcher: {
    id: string
    name: string
    email: string
    phone?: string
    description?: string
    commissionPercent: number
  }
  onSuccess?: () => void
}

export const EditDispatcherModal = ({ trigger, dispatcher, onSuccess }: EditDispatcherModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: dispatcher.name,
    email: dispatcher.email,
    phone: dispatcher.phone || "",
    description: dispatcher.description || "",
    commissionPercent: dispatcher.commissionPercent
  })

  const [updateDispatcher, { loading }] = useMutation(UPDATE_DISPATCHER, {
    onCompleted: () => {
      toast({
        title: "Success",
        description: "Dispatcher updated successfully.",
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
    updateDispatcher({
      variables: {
        input: {
          id: dispatcher.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          description: formData.description || null,
          commissionPercent: formData.commissionPercent
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
          <DialogTitle>Edit Dispatcher</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="commissionPercent">Commission Percent *</Label>
            <Input
              id="commissionPercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.commissionPercent}
              onChange={(e) => setFormData({...formData, commissionPercent: parseFloat(e.target.value) || 0})}
              required
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
              {loading ? "Updating..." : "Update Dispatcher"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}