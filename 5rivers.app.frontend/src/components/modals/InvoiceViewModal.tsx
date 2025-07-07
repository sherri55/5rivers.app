import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
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
  Receipt,
  Calendar,
  DollarSign,
  Building,
  User,
  Mail,
  Download
} from "lucide-react"
import { GET_INVOICE, DOWNLOAD_INVOICE_PDF } from "@/lib/graphql/invoices"
import { useToast } from "@/hooks/use-toast"

interface InvoiceViewModalProps {
  invoiceId?: string
  trigger?: React.ReactNode
}

export function InvoiceViewModal({ invoiceId, trigger }: InvoiceViewModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  
  const { data, loading, error } = useQuery(GET_INVOICE, {
    variables: { id: invoiceId },
    skip: !isOpen || !invoiceId
  })

  const [downloadInvoicePDF, { loading: downloadLoading }] = useMutation(DOWNLOAD_INVOICE_PDF)

  const invoice = data?.invoice

  const handleDownloadPDF = async () => {
    try {
      const result = await downloadInvoicePDF({
        variables: { invoiceId }
      })

      if (result.data?.downloadInvoicePDF?.success) {
        // Convert base64 to blob and download
        const base64Data = result.data.downloadInvoicePDF.data
        const filename = result.data.downloadInvoicePDF.filename || `${invoice?.invoiceNumber || 'invoice'}.pdf`
        
        // Create blob from base64
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'application/pdf' })
        
        // Create download link
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast({
          title: "Success",
          description: "Invoice PDF downloaded successfully",
        })
      } else {
        throw new Error(result.data?.downloadInvoicePDF?.error || 'Failed to generate PDF')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({
        title: "Error",
        description: "Failed to download invoice PDF",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">View Invoice</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Receipt className="h-5 w-5 text-primary" />
              Invoice Details
            </DialogTitle>
            {invoice && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={downloadLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </DialogHeader>
        
        {!invoiceId && (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">No invoice associated with this job</div>
          </div>
        )}

        {loading && invoiceId && (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading invoice details...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center p-8">
            <div className="text-destructive">Error loading invoice: {error.message}</div>
          </div>
        )}

        {invoice && (
          <div className="space-y-6">
            {/* Header */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Invoice #{invoice.invoiceNumber}</span>
                  <Badge variant={invoice.status === 'PAID' ? 'default' : 'secondary'}>
                    {invoice.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-medium">Date:</span> {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-medium">Amount:</span> ${invoice.totalAmount?.toFixed(2) || 'N/A'}
                    </span>
                  </div>
                  
                  {invoice.dueDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">Due:</span> {new Date(invoice.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Billing Information */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.billedTo && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">Billed To:</span> {invoice.billedTo}
                      </span>
                    </div>
                  )}
                  
                  {invoice.billedEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">Email:</span> {invoice.billedEmail}
                      </span>
                    </div>
                  )}
                  
                  {invoice.dispatcher && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">Dispatcher:</span> {invoice.dispatcher.name}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Jobs in Invoice */}
            {invoice.jobs && invoice.jobs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Jobs Included ({invoice.jobs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {invoice.jobs.map((jobEntry: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg bg-muted/20">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-foreground">
                              {jobEntry.job?.jobType?.title || 'Unknown Job'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Job Date: {jobEntry.job?.jobDate ? new Date(jobEntry.job.jobDate).toLocaleDateString() : 'No date'}
                            </div>
                            {jobEntry.job?.jobType?.company && (
                              <div className="text-sm text-muted-foreground">
                                Company: {jobEntry.job.jobType.company.name}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-primary bg-primary/10 px-3 py-1 rounded">
                              ${(jobEntry.job?.calculatedAmount || jobEntry.amount || 0).toFixed(2)}
                            </div>
                            {jobEntry.invoicedAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Invoiced: {new Date(jobEntry.invoicedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Additional Job Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          {jobEntry.job?.driver && (
                            <div>
                              <span className="font-medium">Driver:</span> {jobEntry.job.driver.name}
                            </div>
                          )}
                          {jobEntry.job?.unit && (
                            <div>
                              <span className="font-medium">Unit:</span> {jobEntry.job.unit.name}
                            </div>
                          )}
                          {jobEntry.job?.startTime && jobEntry.job?.endTime && (
                            <div className="col-span-2">
                              <span className="font-medium">Time:</span> {jobEntry.job.startTime} - {jobEntry.job.endTime}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Jobs Summary */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Total from {invoice.jobs.length} job{invoice.jobs.length > 1 ? 's' : ''}:</span>
                      <span className="font-semibold text-lg text-primary">
                        ${invoice.jobs.reduce((sum: number, jobEntry: any) => 
                          sum + (jobEntry.job?.calculatedAmount || jobEntry.amount || 0), 0
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
