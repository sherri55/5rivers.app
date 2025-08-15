import { useState } from "react"
import { createPortal } from "react-dom"
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
  ClipboardList,
  Calendar, 
  Truck, 
  User, 
  Building,
  FileText,
  Clock,
  Weight,
  Package,
  X
} from "lucide-react"
import { formatTimeRange, formatWeightForDisplay, shouldDisplayWeight } from "@/lib/utils/dateUtils"

interface JobDetailModalProps {
  job: any
  trigger?: React.ReactNode
}

export function JobDetailModal({ job, trigger }: JobDetailModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800'
      case 'Received': return 'bg-blue-100 text-blue-800'
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const status = job?.invoiceStatus === 'RECEIVED' && job?.driverPaid ? 'Completed' : 
                job?.invoiceStatus === 'RECEIVED' ? 'Received' : 'Pending'

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || <Button variant="outline" size="sm">Details</Button>}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ClipboardList className="h-5 w-5 text-primary" />
              Job Details: {job?.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Job Status */}
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(status)}>{status}</Badge>
              <span className="text-2xl font-bold text-foreground">
                {job?.calculatedAmount ? `$${job.calculatedAmount.toFixed(2)}` : 'N/A'}
              </span>
            </div>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Job Date</p>
                      <p className="text-sm text-muted-foreground">
                        {job?.jobDate ? new Date(job.jobDate).toLocaleDateString() : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Job Type</p>
                      <p className="text-sm text-muted-foreground">{job?.jobType?.title || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {job?.startTime && job?.endTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Time</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTimeRange(job.startTime, job.endTime)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {shouldDisplayWeight(job?.weight) && (
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Weight</p>
                        <p className="text-sm text-muted-foreground">
                          {formatWeightForDisplay(job?.weight)} tons
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Loads</p>
                      <p className="text-sm text-muted-foreground">{job?.loads || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Job Amount</p>
                      <p className="text-sm font-bold text-foreground">
                        {job?.amount ? `$${Number(job.amount).toFixed(2)}` : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Calculated Amount</p>
                      <p className="text-sm font-bold text-foreground">
                        {job?.calculatedAmount ? `$${job.calculatedAmount.toFixed(2)}` : 'Not calculated'}
                      </p>
                    </div>
                  </div>
                </div>

                {job?.ticketIds && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Ticket IDs</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(() => {
                          const ticketIds = Array.isArray(job.ticketIds) 
                            ? job.ticketIds 
                            : typeof job.ticketIds === 'string' 
                              ? job.ticketIds.split(',').map((id: string) => id.trim()).filter(Boolean)
                              : []
                          return ticketIds.map((ticketId: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {ticketId}
                            </Badge>
                          ))
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Company</p>
                      <p className="text-sm text-muted-foreground">{job?.jobType?.company?.name || 'Not assigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Driver</p>
                      <p className="text-sm text-muted-foreground">{job?.driver?.name || 'Not assigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Dispatcher</p>
                      <p className="text-sm text-muted-foreground">{job?.dispatcher?.name || 'Not assigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Unit</p>
                      <p className="text-sm text-muted-foreground">{job?.unit?.name || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment & Invoice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Invoice Status</p>
                    <p className="text-sm text-muted-foreground">{job?.invoiceStatus || 'Not Invoiced'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Job Type Rate</p>
                    <p className="text-sm text-muted-foreground">
                      {job?.jobType?.rateOfJob ? `$${Number(job.jobType.rateOfJob).toFixed(2)}` : 'Not set'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Invoice Status</p>
                    <Badge variant={job?.invoiceStatus === 'RECEIVED' ? "default" : "secondary"}>
                      {job?.invoiceStatus === 'RECEIVED' ? "Received" : "Pending"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Driver Paid</p>
                    <Badge variant={job?.driverPaid ? "default" : "secondary"}>
                      {job?.driverPaid ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
                
                {job?.calculatedAmount && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Amount After Commission</p>
                      <p className="text-sm font-bold text-accent">
                        ${(job.calculatedAmount - (job.calculatedAmount * ((job.dispatcher?.commissionPercent || 0) / 100))).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Driver Pay</p>
                      <p className="text-sm font-bold text-muted-foreground">
                        ${(job.calculatedAmount * ((job.driver?.hourlyRate || 0) / 100)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {job?.calculatedHours && (
                  <div>
                    <p className="text-sm font-medium">Calculated Hours</p>
                    <p className="text-sm text-muted-foreground">{job.calculatedHours} hours</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Created At</p>
                    <p className="text-sm text-muted-foreground">
                      {job?.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Updated At</p>
                    <p className="text-sm text-muted-foreground">
                      {job?.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>

                {job?.images && job.images.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Job Images</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {job.images.map((imageUrl: string, index: number) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Job image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-75 transition-opacity"
                            onClick={() => setSelectedImage(imageUrl)}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 px-2 py-1 rounded">
                              Click to view full size
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Modal - Rendered outside Dialog using Portal */}
      {selectedImage && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImage}
              alt="Full size view"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}