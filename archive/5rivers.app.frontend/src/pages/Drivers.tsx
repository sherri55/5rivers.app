import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, User, DollarSign, Copy, Clock, Check } from "lucide-react"
import { EnhancedSearch, useEnhancedSearch, type FilterOption, type QuickFilterButton, type EnhancedSearchFilters } from "@/components/EnhancedSearch"
import { DriverModal } from "@/components/modals/DriverModal"
import { DriverJobsViewModal } from "@/components/modals/DriverJobsViewModal"
import { GET_DRIVERS } from "@/lib/graphql/drivers"
import { DELETE_DRIVER } from "@/lib/graphql/mutations"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { useToast } from "@/hooks/use-toast"
import { formatDateForDisplay } from "@/lib/utils/dateUtils"

interface Driver {
  id: string
  name: string
  description?: string
  email: string
  phone?: string
  hourlyRate: number
  createdAt: string
  updatedAt: string
}

export function Drivers() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<EnhancedSearchFilters>({})
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

  // Function to create a duplicate driver with copied data but reset certain fields
  const createDuplicateDriver = (originalDriver: any) => {
    return {
      ...originalDriver,
      id: undefined, // Remove ID so it creates a new driver
      name: `${originalDriver.name} (Copy)`, // Append "Copy" to the name
      email: originalDriver.email ? `copy_${originalDriver.email}` : "", // Prefix email with "copy_" to avoid duplicates
      createdAt: undefined, // Let it set the current date
      updatedAt: undefined, // Let it set the current date
      // Keep all other data including phone, licenseNumber, hourlyRate, etc.
    }
  }

  const drivers: Driver[] = data?.drivers || []

  // Define search fields for drivers
  const getDriverSearchFields = (driver: Driver): string[] => [
    driver.name,
    driver.email,
    driver.description,
    driver.phone,
    driver.hourlyRate?.toString(),
    formatDateForDisplay(driver.createdAt),
    formatDateForDisplay(driver.updatedAt)
  ].filter(Boolean) as string[]

  // Custom filter function for drivers
  const applyDriverFilters = (driver: Driver, filters: EnhancedSearchFilters): boolean => {
    if (filters.hourlyRateMin && driver.hourlyRate < parseFloat(filters.hourlyRateMin)) return false;
    if (filters.hourlyRateMax && driver.hourlyRate > parseFloat(filters.hourlyRateMax)) return false;
    if (filters.hasPhone !== undefined && filters.hasPhone && !driver.phone) return false;
    if (filters.hasPhone !== undefined && !filters.hasPhone && driver.phone) return false;
    if (filters.hasDescription !== undefined && filters.hasDescription && !driver.description) return false;
    if (filters.hasDescription !== undefined && !filters.hasDescription && driver.description) return false;

    return true;
  }

  // Filter configuration for drivers
  const filterConfig: FilterOption[] = [
    {
      key: 'hourlyRateMin',
      label: 'Min Hourly Rate',
      type: 'number',
      placeholder: 'Enter minimum rate'
    },
    {
      key: 'hourlyRateMax',
      label: 'Max Hourly Rate',
      type: 'number',
      placeholder: 'Enter maximum rate'
    },
    {
      key: 'hasPhone',
      label: 'Has Phone',
      type: 'boolean'
    },
    {
      key: 'hasDescription',
      label: 'Has Description',
      type: 'boolean'
    }
  ]

  // Quick filter buttons for drivers
  const quickFilters: QuickFilterButton[] = [
    {
      label: 'High Rate (>$30)',
      icon: DollarSign,
      filterKey: 'hourlyRateMin',
      filterValue: '30'
    },
    {
      label: 'Has Phone',
      icon: User,
      filterKey: 'hasPhone',
      filterValue: true
    }
  ]

  // Use enhanced search hook
  const filteredDrivers = useEnhancedSearch(
    drivers,
    searchTerm,
    filters,
    getDriverSearchFields,
    applyDriverFilters
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

      {/* Enhanced Search and Filter Section */}
      <EnhancedSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        data={drivers}
        filterConfig={filterConfig}
        quickFilters={quickFilters}
        searchPlaceholder="Search drivers... Use & for multiple terms (e.g. 'john & driver & 30')"
        searchFields={getDriverSearchFields}
        className="mb-4"
      />

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
        <span>
          Showing {filteredDrivers.length} of {drivers.length} drivers
          {searchTerm && ` for "${searchTerm}"`}
        </span>
        {(searchTerm || Object.keys(filters).some(key => filters[key] != null)) && (
          <span className="text-xs">
            Use & to search multiple terms (e.g. "john & 30")
          </span>
        )}
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
                    Added {formatDateForDisplay(driver.createdAt)}
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
                  <DriverModal 
                    driver={createDuplicateDriver(driver)} 
                    isDuplicate={true}
                    onSuccess={() => refetch()}
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">
                        <Copy className="h-3 w-3 mr-1" />
                        Duplicate
                      </Button>
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
