import { useState } from "react"
import { useQuery } from "@apollo/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, User, Eye, Edit, DollarSign } from "lucide-react"
import { GET_INVOICES } from "@/lib/graphql/invoices"
import { CreateInvoiceModal } from "@/components/modals/CreateInvoiceModal"
import { InvoiceViewModal } from "@/components/modals/InvoiceViewModal"
import { EditInvoiceModal } from "@/components/modals/EditInvoiceModal"

export function Invoices() {
  const [searchTerm, setSearchTerm] = useState("")
  
  const { data, loading, error, refetch } = useQuery(GET_INVOICES, {
    variables: {
      pagination: {
        page: 1,
        limit: 20,
        offset: 0
      }
    }
  })

  const invoices = data?.invoices || []
  const filteredInvoices = invoices.filter((invoice: any) =>
    invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.billedTo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.status?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    
    // Handle date-only strings by appending a time component
    let dateToFormat = dateString
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      dateToFormat = `${dateString}T00:00:00.000Z`
    }
    
    try {
      return new Date(dateToFormat).toLocaleDateString()
    } catch (error) {
      console.warn('Invalid date format:', dateString)
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="invoices-gradient rounded-2xl p-6 text-white shadow-xl">
          <h1 className="text-3xl font-bold mb-2">Invoices</h1>
          <p className="text-white/90 text-lg">
            Manage invoices and billing
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading invoices: Invoice functionality is being updated</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage invoices and billing.</p>
        </div>
        <CreateInvoiceModal
          trigger={
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          }
          onSuccess={refetch}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No invoices found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "No invoices match your search criteria." : "No invoices have been created yet."}
            </p>
            <CreateInvoiceModal
              trigger={
                <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Invoice
                </Button>
              }
              onSuccess={refetch}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInvoices.map((invoice: any) => (
            <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-orange-600" />
                    {invoice.invoiceNumber || `Invoice #${invoice.id.slice(-6)}`}
                  </CardTitle>
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status || 'Draft'}
                  </Badge>
                </div>
                <CardDescription>
                  {formatDate(invoice.invoiceDate || invoice.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{invoice.billedTo || 'No client'}</span>
                </div>

                {invoice.dispatcher && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Managed by: {invoice.dispatcher.name}</span>
                  </div>
                )}

                {/* Jobs List with Highlighted Amounts */}
                {invoice.jobs && invoice.jobs.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium text-foreground mb-2">
                      Jobs Included ({invoice.jobs.length})
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {invoice.jobs.map((jobEntry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-xs bg-muted/50 rounded p-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {jobEntry.job?.jobType?.title || 'Unknown Job'}
                            </div>
                            <div className="text-muted-foreground">
                              {jobEntry.job?.jobDate ? formatDate(jobEntry.job.jobDate) : 'No date'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-primary font-semibold bg-primary/10 px-2 py-1 rounded">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(jobEntry.amount || jobEntry.job?.calculatedAmount || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Amount */}
                {invoice.calculations && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Amount</span>
                      <span className="font-semibold text-lg text-primary">
                        {formatCurrency(invoice.calculations.total || 0)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <InvoiceViewModal 
                    invoiceId={invoice.id}
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    }
                  />
                  <EditInvoiceModal
                    invoiceId={invoice.id}
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    }
                    onSuccess={refetch}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
