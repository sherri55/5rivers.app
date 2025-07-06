import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Calendar, DollarSign, Badge } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AssignJobModalProps {
  trigger: React.ReactNode
  driver: {
    id: number
    name: string
    status: string
  }
}

export const AssignJobModal = ({ trigger, driver }: AssignJobModalProps) => {
  const [open, setOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState("")
  const { toast } = useToast()

  const availableJobs = [
    {
      id: "JOB-101",
      company: "ABC Logistics Inc.",
      origin: "Dallas, TX",
      destination: "Austin, TX",
      pickupDate: "2024-01-18",
      deliveryDate: "2024-01-19",
      amount: "$1,500",
      priority: "Standard",
      truckType: "Box Truck"
    },
    {
      id: "JOB-102",
      company: "Global Freight Solutions",
      origin: "Houston, TX",
      destination: "San Antonio, TX",
      pickupDate: "2024-01-20",
      deliveryDate: "2024-01-21",
      amount: "$2,200",
      priority: "High",
      truckType: "Semi-Trailer"
    },
    {
      id: "JOB-103",
      company: "Rapid Transport Co.",
      origin: "Fort Worth, TX",
      destination: "Lubbock, TX",
      pickupDate: "2024-01-22",
      deliveryDate: "2024-01-23",
      amount: "$1,800",
      priority: "Urgent",
      truckType: "Flatbed"
    }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-destructive text-destructive-foreground'
      case 'High':
        return 'bg-primary text-primary-foreground'
      case 'Standard':
        return 'bg-secondary text-secondary-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const handleAssign = () => {
    if (!selectedJob) return
    
    const job = availableJobs.find(j => j.id === selectedJob)
    toast({
      title: "Job Assigned",
      description: `${job?.id} has been assigned to ${driver.name}.`,
    })
    setOpen(false)
    setSelectedJob("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Job to {driver.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Available Jobs</Label>
            <div className="space-y-3">
              {availableJobs.map((job) => (
                <Card 
                  key={job.id} 
                  className={`cursor-pointer transition-smooth border-border hover:shadow-elevated ${
                    selectedJob === job.id ? 'ring-2 ring-primary bg-accent/10' : 'bg-gradient-card shadow-card'
                  }`}
                  onClick={() => setSelectedJob(job.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-foreground">{job.id}</div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2">{job.company}</div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground">From</div>
                          <div className="font-medium text-foreground">{job.origin}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground">To</div>
                          <div className="font-medium text-foreground">{job.destination}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground">Pickup</div>
                          <div className="font-medium text-foreground">{job.pickupDate}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-accent" />
                        <div>
                          <div className="text-muted-foreground">Amount</div>
                          <div className="font-semibold text-accent">{job.amount}</div>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="text-muted-foreground">Truck Type</div>
                        <div className="font-medium text-foreground">{job.truckType}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedJob}
              className="flex-1"
            >
              Assign Selected Job
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}