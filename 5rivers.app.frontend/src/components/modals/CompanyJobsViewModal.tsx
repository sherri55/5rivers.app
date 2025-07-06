import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, DollarSign, Truck, Clock, Package } from "lucide-react"
import { useQuery } from "@apollo/client"
import { GET_COMPANY } from "@/lib/graphql/companies"

interface CompanyJobsViewModalProps {
  trigger: React.ReactNode
  company: {
    id: string
    name: string
  }
}

export const CompanyJobsViewModal = ({ trigger, company }: CompanyJobsViewModalProps) => {
  const { data, loading, error } = useQuery(GET_COMPANY, {
    variables: { id: company.id },
    skip: !company.id
  })

  const jobs = data?.company?.jobs || []

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
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Jobs for {company.name}</DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading jobs...</div>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8">
            <div className="text-red-500">Error loading jobs: {error.message}</div>
          </div>
        )}
        
        {!loading && !error && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {jobs.length} jobs for this company
            </div>
            
            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No jobs found</h3>
                <p className="text-muted-foreground">This company doesn't have any jobs yet.</p>
              </div>
            ) : (
              jobs.map((job: any) => (
                <Card key={job.id} className="bg-gradient-card shadow-card border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-foreground">{job.id}</div>
                      <Badge className={getStatusColor(job.invoiceStatus)}>
                        {job.invoiceStatus?.replace('_', ' ') || 'Pending'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-muted-foreground">Job Date</div>
                          <div className="font-medium text-foreground">
                            {job.jobDate ? new Date(job.jobDate).toLocaleDateString() : 'Not set'}
                          </div>
                        </div>
                      </div>
                      
                      {job.weight && (
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-muted-foreground">Weight</div>
                            <div className="font-medium text-foreground">{job.weight}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {(job.startTime || job.endTime) && (
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        {job.startTime && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-muted-foreground">Start Time</div>
                              <div className="font-medium text-foreground">{job.startTime}</div>
                            </div>
                          </div>
                        )}
                        
                        {job.endTime && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-muted-foreground">End Time</div>
                              <div className="font-medium text-foreground">{job.endTime}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {job.calculatedAmount && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-accent" />
                          <div>
                            <div className="text-muted-foreground">Amount</div>
                            <div className="font-semibold text-accent">${job.calculatedAmount}</div>
                          </div>
                        </div>
                      )}
                      
                      {job.loads > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-muted-foreground">Loads</div>
                            <div className="font-medium text-foreground">{job.loads}</div>
                          </div>
                        </div>
                      )}
                      
                      {job.driver && (
                        <div className="text-sm">
                          <div className="text-muted-foreground">Driver</div>
                          <div className="font-medium text-foreground">{job.driver.name}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <div>Payment: {job.paymentReceived ? 'Received' : 'Pending'}</div>
                      <div>Driver Paid: {job.driverPaid ? 'Yes' : 'No'}</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}