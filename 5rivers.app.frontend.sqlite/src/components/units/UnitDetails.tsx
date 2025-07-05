import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/src/components/ui/alert";
import { Button } from "@/src/components/ui/button";

export function UnitDetails({ unit, onDelete }) {
  if (!unit) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Unit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default">
            <AlertTitle>No Unit Selected</AlertTitle>
            <AlertDescription>
              Please select a unit from the list to view its details.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Unit Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Name
            </div>
            <div className="font-medium text-base">{unit.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Plate Number
            </div>
            <div className="text-base">{unit.plateNumber || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              VIN
            </div>
            <div className="font-mono text-base">{unit.vin || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Color
            </div>
            <div className="text-base">{unit.color || "—"}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Description
            </div>
            <div className="text-base whitespace-pre-wrap">
              {unit.description || "—"}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground uppercase mb-1">
              ID
            </div>
            <div className="font-mono text-xs">{unit.unitId}</div>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <Button
            type="button"
            variant="destructive"
            className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
            onClick={onDelete}
          >
            Delete Unit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
