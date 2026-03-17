import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Mail, Paperclip, Send } from "lucide-react"

interface SendInvoiceModalProps {
  trigger: React.ReactNode
  invoice: {
    id: string
    company: string
    amount: string
  }
}

export const SendInvoiceModal = ({ trigger, invoice }: SendInvoiceModalProps) => {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    to: "",
    cc: "",
    subject: `Invoice ${invoice.id} from Your Company`,
    message: `Dear ${invoice.company} Team,

Please find attached invoice ${invoice.id} for ${invoice.amount}.

Payment is due within 30 days of receipt. If you have any questions regarding this invoice, please don't hesitate to contact us.

Thank you for your business.

Best regards,
Dispatch Team`,
    attachPdf: true,
    sendCopy: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: "Invoice Sent",
      description: `Invoice ${invoice.id} has been sent to ${formData.to}.`,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invoice {invoice.id}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To *</Label>
            <Input
              id="to"
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({...formData, to: e.target.value})}
              placeholder="recipient@company.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cc">CC</Label>
            <Input
              id="cc"
              type="email"
              value={formData.cc}
              onChange={(e) => setFormData({...formData, cc: e.target.value})}
              placeholder="cc@company.com (optional)"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              rows={8}
              className="resize-none"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="attachPdf"
                checked={formData.attachPdf}
                onCheckedChange={(checked) => setFormData({...formData, attachPdf: checked as boolean})}
              />
              <Label htmlFor="attachPdf" className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4" />
                Attach PDF invoice
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendCopy"
                checked={formData.sendCopy}
                onCheckedChange={(checked) => setFormData({...formData, sendCopy: checked as boolean})}
              />
              <Label htmlFor="sendCopy" className="text-sm">
                Send a copy to myself
              </Label>
            </div>
          </div>
          
          <div className="bg-muted p-3 rounded-md">
            <div className="text-sm font-medium text-foreground mb-1">Invoice Summary</div>
            <div className="text-sm text-muted-foreground">
              <div>Invoice: {invoice.id}</div>
              <div>Company: {invoice.company}</div>
              <div>Amount: {invoice.amount}</div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              <Send className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}