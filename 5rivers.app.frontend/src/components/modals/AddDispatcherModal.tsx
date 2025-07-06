import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useMutation } from "@apollo/client"
import { CREATE_DISPATCHER } from "@/lib/graphql/dispatchers"

interface AddDispatcherModalProps {
  trigger: React.ReactNode
  onSuccess?: () => void
}

export const AddDispatcherModal = ({ trigger, onSuccess }: AddDispatcherModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [createDispatcher, { loading }] = useMutation(CREATE_DISPATCHER)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    phone: "",
    commissionPercent: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createDispatcher({
        variables: {
          input: {
            name: formData.name,
            description: formData.description || null,
            email: formData.email,
            phone: formData.phone || null,
            commissionPercent: parseFloat(formData.commissionPercent)
          }
        }
      })
      
      toast({
        title: "Dispatcher Created",
        description: `${formData.name} has been added successfully.`,
      })
      
      setOpen(false)
      setFormData({
        name: "",
        description: "",
        email: "",
        phone: "",
        commissionPercent: ""
      })
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create dispatcher. Please try again.",
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
          <DialogTitle>Add New Dispatcher</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Dispatcher Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                placeholder="dispatcher@email.com"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="commissionPercent">Commission % *</Label>
              <Input
                id="commissionPercent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.commissionPercent}
                onChange={(e) => setFormData({...formData, commissionPercent: e.target.value})}
                required
                placeholder="15.00"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Additional information about the dispatcher"
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Dispatcher"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}