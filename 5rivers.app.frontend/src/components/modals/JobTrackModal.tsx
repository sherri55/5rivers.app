import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Truck, 
  User, 
  Phone, 
  Route,
  Fuel,
  AlertTriangle 
} from "lucide-react"

interface JobTrackModalProps {
  job: any
  trigger?: React.ReactNode
}

export function JobTrackModal({ job, trigger }: JobTrackModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Mock tracking data
  const trackingData = {
    currentLocation: "I-35, Mile Marker 245, Dallas, TX",
    nextStop: "Rest Area - 15 miles",
    estimatedArrival: "2024-01-16 14:30 EST",
    speed: "65 mph",
    fuelLevel: "75%",
    lastUpdate: "2 minutes ago",
    milesToDestination: 156,
    alerts: [
      { type: "info", message: "Driver took mandatory break at 10:30 AM" },
      { type: "warning", message: "Construction zone ahead - expect delays" }
    ],
    timeline: [
      { time: "08:00", status: "Departed", location: "Dallas, TX", completed: true },
      { time: "10:30", status: "Rest Break", location: "Waco, TX", completed: true },
      { time: "12:15", status: "Current Location", location: "Austin, TX", completed: true },
      { time: "14:30", status: "Expected Arrival", location: "Houston, TX", completed: false },
      { time: "15:00", status: "Delivery", location: "Houston Warehouse", completed: false }
    ]
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">Track</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Navigation className="h-5 w-5 text-primary" />
            Live Tracking - {job?.id}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Current Location</span>
                </div>
                <p className="font-semibold text-foreground">{trackingData.currentLocation}</p>
                <p className="text-xs text-muted-foreground">Updated {trackingData.lastUpdate}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-muted-foreground">ETA</span>
                </div>
                <p className="font-semibold text-foreground">{trackingData.estimatedArrival}</p>
                <p className="text-xs text-muted-foreground">{trackingData.milesToDestination} miles remaining</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Vehicle Status</span>
                </div>
                <p className="font-semibold text-foreground">{trackingData.speed}</p>
                <p className="text-xs text-muted-foreground">Fuel: {trackingData.fuelLevel}</p>
              </CardContent>
            </Card>
          </div>

          {/* Driver & Vehicle Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Driver Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium text-foreground">{job?.driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      (555) 123-4567
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="secondary">Driving</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  Vehicle Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Truck:</span>
                    <span className="font-medium text-foreground">{job?.truck}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fuel Level:</span>
                    <div className="flex items-center gap-2">
                      <Fuel className="h-3 w-3 text-accent" />
                      <span className="font-medium text-foreground">{trackingData.fuelLevel}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Speed:</span>
                    <span className="font-medium text-foreground">{trackingData.speed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Route Timeline */}
          <Card className="bg-gradient-card border-0">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                Route Timeline
              </h3>
              <div className="space-y-4">
                {trackingData.timeline.map((event, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      event.completed 
                        ? 'bg-accent' 
                        : index === trackingData.timeline.findIndex(e => !e.completed)
                          ? 'bg-primary' 
                          : 'bg-muted'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${
                          event.completed ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {event.status}
                        </span>
                        <span className="text-sm text-muted-foreground">{event.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          {trackingData.alerts.length > 0 && (
            <Card className="bg-gradient-card border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-accent" />
                  Recent Alerts
                </h3>
                <div className="space-y-2">
                  {trackingData.alerts.map((alert, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      alert.type === 'warning' ? 'bg-destructive/10 border-destructive/20' : 'bg-primary/10 border-primary/20'
                    }`}>
                      <p className="text-sm text-foreground">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button className="bg-gradient-primary hover:bg-primary-hover">
            Contact Driver
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}