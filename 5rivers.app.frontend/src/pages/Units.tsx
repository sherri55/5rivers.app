import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Truck, Palette, Edit, Eye } from "lucide-react"
import { AddUnitModal } from "@/components/modals/AddUnitModal"
import { EditUnitModal } from "@/components/modals/EditUnitModal"
import { UnitJobsViewModal } from "@/components/modals/UnitJobsViewModal"
import { GET_UNITS } from "@/lib/graphql/units"
import { DELETE_UNIT } from "@/lib/graphql/mutations"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { useToast } from "@/hooks/use-toast"

export function Units() {
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  
  const { data, loading, error, refetch } = useQuery(GET_UNITS, {
    variables: {
      pagination: { 
        page: 1, 
        limit: 20,
        offset: 0
      }
    }
  })

  const [deleteUnit] = useMutation(DELETE_UNIT, {
    onCompleted: () => {
      toast({
        title: "Unit deleted",
        description: "Unit has been deleted successfully.",
      })
      refetch()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete unit: ${error.message}`,
        variant: "destructive"
      })
    },
  })

  const handleDeleteUnit = async (unitId: string) => {
    try {
      await deleteUnit({ variables: { id: unitId } })
    } catch (error) {
      console.error('Error deleting unit:', error)
    }
  }

  const units = data?.units || []
  const filteredUnits = units.filter((unit: any) =>
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (unit.plateNumber && unit.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (error) {
    return (
     <div className="space-y-6">
        <div className="units-gradient rounded-2xl p-6 text-white shadow-xl">
          <h1 className="text-3xl font-bold mb-2">Fleet Units</h1>
          <p className="text-white/90 text-lg">
            Manage fleet vehicles, track status, and assign to jobs
          </p>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600">Error loading units: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Fleet Units</h1>
                <p className="text-muted-foreground">Manage fleet vehicles, track status, and assign to jobs.</p>
              </div>
              <AddUnitModal
                trigger={
                  <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Unit
                  </Button>
                }
                onSuccess={refetch}
              />
            </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search units..."
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUnits.map((unit: any) => (
            <Card key={unit.id} className="bg-gradient-card shadow-card border-0 hover:shadow-elevated transition-smooth">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Truck className="h-5 w-5 text-primary" />
                  {unit.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {unit.plateNumber && (
                    <span className="text-sm text-muted-foreground">{unit.plateNumber}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Vehicle</span>
                </div>
                
                {unit.color && (
                  <div className="flex items-center gap-2 text-sm">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{unit.color}</span>
                  </div>
                )}
                
                {unit.vin && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">VIN:</span>
                    <span className="text-xs text-muted-foreground font-mono">{unit.vin}</span>
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Added</div>
                  <div className="text-lg font-bold text-primary">
                    {new Date(unit.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <EditUnitModal
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    }
                    unit={unit}
                    onSuccess={refetch}
                  />
                  <UnitJobsViewModal
                    trigger={
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View Jobs
                      </Button>
                    }
                    unit={unit}
                  />
                  <ConfirmDeleteDialog
                    title="Delete Unit"
                    description="Are you sure you want to delete this unit? This action cannot be undone and will fail if the unit has assigned jobs."
                    onConfirm={() => handleDeleteUnit(unit.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredUnits.length === 0 && (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? "No units found" : "No units yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? `No units match "${searchTerm}"`
              : "Get started by adding your first unit"
            }
          </p>
          {!searchTerm && (
            <AddUnitModal
              trigger={
                <Button className="bg-white/20 hover:bg-white/30 text-primary border-white/20 backdrop-blur-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Unit
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
