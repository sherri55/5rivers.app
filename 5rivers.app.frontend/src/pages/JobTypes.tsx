import { useState } from "react"
import { useQuery } from "@apollo/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Briefcase, DollarSign, MapPin, Truck, Edit, Eye } from "lucide-react"
import { AddJobTypeModal } from "@/components/modals/AddJobTypeModal"
import { EditJobTypeModal } from "@/components/modals/EditJobTypeModal"
import { JobTypeJobsViewModal } from "@/components/modals/JobTypeJobsViewModal"
import { GET_JOB_TYPES } from "@/lib/graphql/jobTypes"

export function JobTypes() {
  const [searchTerm, setSearchTerm] = useState("")
  const { data, loading, error, refetch } = useQuery(GET_JOB_TYPES, {
    variables: {
      pagination: { 
        page: 1, 
        limit: 20,
        offset: 0
      }
    }
  })

  const jobTypes = data?.jobTypes || []
  const filteredJobTypes = jobTypes.filter((jobType: any) =>
    jobType.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (jobType.company?.name && jobType.company.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Group job types by company
  const jobTypesByCompany = filteredJobTypes.reduce((groups: any, jobType: any) => {
    const companyName = jobType.company?.name || 'No Company'
    if (!groups[companyName]) {
      groups[companyName] = []
    }
    groups[companyName].push(jobType)
    return groups
  }, {})

  // Sort companies alphabetically
  const sortedCompanies = Object.keys(jobTypesByCompany).sort()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

    if (error) {
      return (
       <div className="space-y-6">
          <div className="jobtypes-gradient rounded-2xl p-6 text-white shadow-xl">
            <h1 className="text-3xl font-bold mb-2">Job Types</h1>
            <p className="text-white/90 text-lg">
              Manage job categories and pricing structures
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-red-600">Error loading job types: {error.message}</p>
          </div>
        </div>
      )
    }
  
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Job Types</h1>
                  <p className="text-muted-foreground">Manage job categories and pricing structures.</p>
                </div>
                <AddJobTypeModal
                  trigger={
                    <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Job Type
                    </Button>
                  }
                  onSuccess={refetch}
                />
              </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search job types..."
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
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {sortedCompanies.map((companyName) => {
            const companyJobTypes = jobTypesByCompany[companyName]
            return (
              <div key={companyName} className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{companyName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {companyJobTypes.length} job type{companyJobTypes.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-11">
                  {companyJobTypes.map((jobType: any) => (
                    <Card key={jobType.id} className="hover:shadow-lg transition-shadow duration-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 jobtypes-gradient rounded-lg">
                              <Briefcase className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{jobType.title}</CardTitle>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Truck className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium">Dispatch:</span>
                          <Badge variant="secondary" className="bg-orange-50 text-orange-700">
                            {jobType.dispatchType}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Rate:</span>
                          <Badge variant="secondary" className="bg-green-50 text-green-700">
                            {formatCurrency(jobType.rateOfJob)}
                          </Badge>
                        </div>

                        {(jobType.startLocation || jobType.endLocation) && (
                          <div className="space-y-2">
                            {jobType.startLocation && (
                              <div className="flex items-center space-x-2 text-sm">
                                <MapPin className="h-3 w-3 text-blue-600" />
                                <span className="font-medium">From:</span>
                                <span className="text-muted-foreground">{jobType.startLocation}</span>
                              </div>
                            )}
                            {jobType.endLocation && (
                              <div className="flex items-center space-x-2 text-sm">
                                <MapPin className="h-3 w-3 text-red-600" />
                                <span className="font-medium">To:</span>
                                <span className="text-muted-foreground">{jobType.endLocation}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            Added {new Date(jobType.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <EditJobTypeModal
                            trigger={
                              <Button variant="outline" size="sm" className="flex-1">
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            }
                            jobType={jobType}
                            onSuccess={refetch}
                          />
                          <JobTypeJobsViewModal
                            trigger={
                              <Button variant="outline" size="sm" className="flex-1">
                                <Eye className="h-3 w-3 mr-1" />
                                View Jobs
                              </Button>
                            }
                            jobType={jobType}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && filteredJobTypes.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? "No job types found" : "No job types yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? `No job types match "${searchTerm}"`
              : "Get started by adding your first job type"
            }
          </p>
          {!searchTerm && (
            <AddJobTypeModal
              trigger={
                <Button className="jobtypes-gradient text-white border-0 hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Job Type
                </Button>
              }
              onSuccess={refetch}
            />
          )}
        </div>
      )}
    </div>
  )
}
