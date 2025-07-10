import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building, Plus, MapPin, Phone, Mail } from "lucide-react"
import { useQuery, useMutation } from "@apollo/client"
import { GET_COMPANIES } from "@/lib/graphql/companies"
import { DELETE_COMPANY } from "@/lib/graphql/mutations"
import { CompanyEditModal } from "@/components/modals/CompanyEditModal"
import { AddCompanyModal } from "@/components/modals/AddCompanyModal"
import { CompanyJobsViewModal } from "@/components/modals/CompanyJobsViewModal"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { useToast } from "@/hooks/use-toast"

export function Companies() {
  const { toast } = useToast()
  
  const { data, loading, error, refetch } = useQuery(GET_COMPANIES, {
    variables: {
      pagination: { 
        page: 1, 
        limit: 1000,
        offset: 0
      }
    }
  })

  const [deleteCompany] = useMutation(DELETE_COMPANY, {
    onCompleted: () => {
      toast({
        title: "Company deleted",
        description: "Company has been deleted successfully.",
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete company: ${error.message}`,
        variant: "destructive"
      })
    },
  })

  const handleDeleteCompany = async (companyId: string) => {
    try {
      await deleteCompany({ variables: { id: companyId } })
    } catch (error) {
      console.error('Error deleting company:', error)
    }
  }

  if (loading) return <div>Loading companies...</div>
  if (error) return <div>Error loading companies: {error.message}</div>

  const companies = data?.companies?.nodes || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground">Manage client companies and business relationships.</p>
        </div>
        <AddCompanyModal 
          onSuccess={() => refetch()}
          trigger={
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          } 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {companies.map((company: any) => (
          <Card key={company.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building className="h-5 w-5 text-primary" />
                {company.name}
              </CardTitle>
              {company.size && (
                <span className="px-2 py-1 bg-accent text-accent-foreground rounded text-xs font-medium w-fit">
                  {company.size}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {company.location && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{company.location}</span>
                </div>
              )}
              
              {company.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{company.phone}</span>
                </div>
              )}
              
              {company.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{company.email}</span>
                </div>
              )}
              
              {company.industry && (
                <div className="text-sm">
                  <span className="font-medium text-foreground">Industry:</span>
                  <span className="text-muted-foreground ml-1">{company.industry}</span>
                </div>
              )}
              
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">Active Jobs</div>
                <div className="text-lg font-bold text-primary">
                  {company.jobs?.length || 0}
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <CompanyEditModal 
                  company={company} 
                  onSuccess={() => refetch()}
                  trigger={
                    <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                  } 
                />
                <CompanyJobsViewModal 
                  company={company} 
                  trigger={
                    <Button variant="outline" size="sm" className="flex-1">
                      View Jobs
                    </Button>
                  } 
                />
                <ConfirmDeleteDialog
                  title="Delete Company"
                  description="Are you sure you want to delete this company? This action cannot be undone and will fail if the company has job types."
                  onConfirm={() => handleDeleteCompany(company.id)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No companies found</h3>
          <p className="text-muted-foreground mb-4">Get started by adding your first company.</p>
          <AddCompanyModal 
            onSuccess={() => refetch()}
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Company
              </Button>
            } 
          />
        </div>
      )}
    </div>
  )
}
