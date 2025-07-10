import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, User, DollarSign } from "lucide-react"
import { DriverModal } from "@/components/modals/DriverModal"
import { DriverJobsViewModal } from "@/components/modals/DriverJobsViewModal"
import { GET_DRIVERS } from "@/lib/graphql/drivers"
import { DELETE_DRIVER } from "@/lib/graphql/mutations"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { useToast } from "@/hooks/use-toast"

export function Drivers() {
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  
  const { data, loading, error, refetch } = useQuery(GET_DRIVERS, {
    variables: {
      pagination: { 
        page: 1, 
        limit: 1000,
        offset: 0
      }
    }
  })

  const [deleteDriver] = useMutation(DELETE_DRIVER, {
    onCompleted: () => {
      toast({
        title: "Driver deleted",
        description: "Driver has been deleted successfully.",
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete driver: ${error.message}`,
        variant: "destructive"
      })
    },
  })

  const handleDeleteDriver = async (driverId: string) => {
    try {
      await deleteDriver({ variables: { id: driverId } })
    } catch (error) {
      console.error('Error deleting driver:', error)
    }
  }

  const drivers = data?.drivers || []
  const filteredDrivers = drivers.filter((driver: any) =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="drivers-gradient rounded-2xl p-6 text-white shadow-xl">
          <h1 className="text-3xl font-bold mb-2">Drivers</h1>
          <p className="text-white/90 text-lg">
            Manage your fleet drivers and their information
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading drivers: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Drivers</h1>
          <p className="text-muted-foreground">Manage your fleet drivers and their information.</p>
        </div>
        <DriverModal
          trigger={
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          }
          onSuccess={refetch}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drivers..."
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
          {filteredDrivers.map((driver: any) => (
            <Card key={driver.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 drivers-gradient rounded-lg">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{driver.name}</CardTitle>
                      <CardDescription className="text-sm">{driver.email}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {driver.phone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium">Phone:</span>
                    <span className="text-muted-foreground">{driver.phone}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Hourly Rate:</span>
                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                    {formatCurrency(driver.hourlyRate)}/hr
                  </Badge>
                </div>

                {driver.description && (
                  <div className="text-sm text-muted-foreground">
                    {driver.description}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Added {new Date(driver.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <DriverModal 
                    driver={driver} 
                    onSuccess={() => refetch()}
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                    } 
                  />
                  <DriverJobsViewModal 
                    driver={driver} 
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">
                        View Jobs
                      </Button>
                    } 
                  />
                  <ConfirmDeleteDialog
                    title="Delete Driver"
                    description="Are you sure you want to delete this driver? This action cannot be undone and will fail if the driver has assigned jobs."
                    onConfirm={() => handleDeleteDriver(driver.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredDrivers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? "No drivers found" : "No drivers yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? `No drivers match "${searchTerm}"`
              : "Get started by adding your first driver"
            }
          </p>
          {!searchTerm && (
            <DriverModal
              trigger={
                <Button className="drivers-gradient text-white border-0 hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Driver
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
