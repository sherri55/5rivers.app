import { useState } from "react"
import { useQuery } from "@apollo/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Radio, Percent, Edit, Briefcase } from "lucide-react"
import { AddDispatcherModal } from "@/components/modals/AddDispatcherModal"
import { EditDispatcherModal } from "@/components/modals/EditDispatcherModal"
import { DispatcherJobsViewModal } from "@/components/modals/DispatcherJobsViewModal"
import { GET_DISPATCHERS } from "@/lib/graphql/dispatchers"

export function Dispatchers() {
  const [searchTerm, setSearchTerm] = useState("")
  const { data, loading, error, refetch } = useQuery(GET_DISPATCHERS, {
    variables: {
      pagination: { 
        page: 1, 
        limit: 20,
        offset: 0
      }
    }
  })

  const dispatchers = data?.dispatchers || []
  const filteredDispatchers = dispatchers.filter((dispatcher: any) =>
    dispatcher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispatcher.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (error) {
    return (
      <div className="space-y-6">
        <div className="dispatchers-gradient rounded-2xl p-6 text-white shadow-xl">
          <h1 className="text-3xl font-bold mb-2">Dispatchers</h1>
          <p className="text-white/90 text-lg">
            Manage dispatch staff and their assignments
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading dispatchers: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dispatchers</h1>
          <p className="text-muted-foreground">Manage dispatch staff and their assignments.</p>
        </div>
        <AddDispatcherModal
          trigger={
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Dispatcher
            </Button>
          }
          onSuccess={refetch}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dispatchers..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDispatchers.map((dispatcher: any) => (
            <Card key={dispatcher.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 dispatchers-gradient rounded-lg">
                      <Radio className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{dispatcher.name}</CardTitle>
                      <CardDescription className="text-sm">{dispatcher.email}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dispatcher.phone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium">Phone:</span>
                    <span className="text-muted-foreground">{dispatcher.phone}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Percent className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Commission:</span>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    {dispatcher.commissionPercent}%
                  </Badge>
                </div>

                {dispatcher.description && (
                  <div className="text-sm text-muted-foreground">
                    {dispatcher.description}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Added {new Date(dispatcher.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <EditDispatcherModal
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    }
                    dispatcher={dispatcher}
                    onSuccess={refetch}
                  />
                  <DispatcherJobsViewModal
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">
                        <Briefcase className="h-4 w-4 mr-1" />
                        View Jobs
                      </Button>
                    }
                    dispatcher={dispatcher}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredDispatchers.length === 0 && (
        <div className="text-center py-12">
          <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? "No dispatchers found" : "No dispatchers yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? `No dispatchers match "${searchTerm}"`
              : "Get started by adding your first dispatcher"
            }
          </p>
          {!searchTerm && (
            <AddDispatcherModal
              trigger={
                <Button className="dispatchers-gradient text-white border-0 hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Dispatcher
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
