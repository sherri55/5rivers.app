import { useState } from "react"
import { useQuery } from "@apollo/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Building,
  MapPin,
  DollarSign,
  Calendar,
  FileText
} from "lucide-react"
import { GET_JOB_TYPE } from "@/lib/graphql/jobTypes"

interface JobTypeViewModalProps {
  jobTypeId: string
  trigger?: React.ReactNode
}

export function JobTypeViewModal({ jobTypeId, trigger }: JobTypeViewModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const { data, loading, error } = useQuery(GET_JOB_TYPE, {
    variables: { id: jobTypeId },
    skip: !isOpen
  })

  const jobType = data?.jobType

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">View Job Type</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5 text-primary" />
            Job Type Details
          </DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading job type details...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center p-8">
            <div className="text-destructive">Error loading job type: {error.message}</div>
          </div>
        )}

        {jobType && (
          <div className="space-y-6">
            {/* Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{jobType.title}</span>
                  <Badge variant="outline">
                    {jobType.dispatchType}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobType.company && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">Company:</span> {jobType.company.name}
                      </span>
                    </div>
                  )}
                  
                  {jobType.startLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">Start:</span> {jobType.startLocation}
                      </span>
                    </div>
                  )}
                  
                  {jobType.endLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">End:</span> {jobType.endLocation}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-medium">Rate:</span> ${jobType.rateOfJob?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-medium">Created:</span> {new Date(jobType.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dispatch Type Details */}
            <Card>
              <CardHeader>
                <CardTitle>Dispatch Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="font-medium">Dispatch Type</div>
                    <div className="text-sm text-muted-foreground">
                      {jobType.dispatchType === 'Hourly' && 'Payment calculated based on hours worked'}
                      {jobType.dispatchType === 'Tonnage' && 'Payment calculated based on weight/tonnage'}
                      {jobType.dispatchType === 'Load' && 'Payment calculated based on number of loads'}
                      {jobType.dispatchType === 'Fixed' && 'Fixed payment amount per job'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium">Rate</div>
                    <div className="text-sm text-muted-foreground">
                      ${jobType.rateOfJob?.toFixed(2) || 'N/A'} per {jobType.dispatchType?.toLowerCase()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
