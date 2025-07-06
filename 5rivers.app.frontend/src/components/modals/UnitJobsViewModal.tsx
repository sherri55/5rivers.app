import { useState } from "react"
import { useQuery } from "@apollo/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, DollarSign, User, Loader2 } from "lucide-react"
import { GET_UNIT } from "@/lib/graphql/units"

interface UnitJobsViewModalProps {
  trigger: React.ReactNode
  unit: {
    id: string
    name: string
  }
}

export const UnitJobsViewModal = ({ trigger, unit }: UnitJobsViewModalProps) => {
  const [open, setOpen] = useState(false)
  
  const { data, loading, error } = useQuery(GET_UNIT, {
    variables: { id: unit.id },
    skip: !open,
  })

  const jobs = data?.unit?.jobs || []

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'paid':
        return 'bg-emerald-100 text-emerald-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Jobs for {unit.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-muted-foreground">Loading jobs...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Error loading jobs: {error.message}</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No jobs found for {unit.name}</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                Showing {jobs.length} job{jobs.length !== 1 ? 's' : ''} for {unit.name}
              </div>
              
              {jobs.map((job: any) => (
                <Card key={job.id} className="bg-gradient-card shadow-card border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-foreground">Job #{job.id}</div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(job.invoiceStatus)}>
                          {job.invoiceStatus?.replace('_', ' ') || 'Pending'}
                        </Badge>
                        {job.paymentReceived && (
                          <Badge className="bg-green-100 text-green-800">
                            Paid
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground">Date</div>
                          <div className="font-medium text-foreground">
                            {new Date(job.jobDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-accent" />
                        <div>
                          <div className="text-muted-foreground">Amount</div>
                          <div className="font-semibold text-accent">
                            ${job.calculatedAmount?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground">Driver</div>
                          <div className="font-medium text-foreground">
                            {job.driver?.name || 'Unassigned'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {job.calculatedHours && (
                      <div className="mt-3 text-sm">
                        <span className="text-muted-foreground">Hours: </span>
                        <span className="font-medium">{job.calculatedHours.toFixed(2)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
