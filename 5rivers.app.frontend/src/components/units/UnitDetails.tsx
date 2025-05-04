import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function UnitDetails({ unit }) {
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
        <div className="space-y-2">
          <div>
            <span className="font-semibold">Name:</span> {unit.name}
          </div>
          <div>
            <span className="font-semibold">Description:</span>{" "}
            {unit.description}
          </div>
          <div>
            <span className="font-semibold">ID:</span> {unit.unitId}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
