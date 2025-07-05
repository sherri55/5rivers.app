"use client";

import { Button } from "@/src/components/ui/button";
import { Unit } from "@/src/types/entities";
import { Truck, Hash, Palette, FileText } from "lucide-react";

interface UnitViewProps {
  unit: Unit;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function UnitView({
  unit,
  onEdit,
  onDelete,
  onClose,
}: UnitViewProps) {
  return (
    <div className="slide-over-form">
      <div className="form-section">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Unit ID
            </div>
            <div className="font-mono text-base">{unit.unitId}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Unit Name
            </div>
            <div className="text-base font-medium flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              {unit.name}
            </div>
          </div>

          {unit.plateNumber && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Plate Number
              </div>
              <div className="text-base">
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-mono">
                  {unit.plateNumber}
                </span>
              </div>
            </div>
          )}

          {unit.color && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Color
              </div>
              <div className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4 text-gray-500" />
                <span className="capitalize">{unit.color}</span>
              </div>
            </div>
          )}

          {unit.vin && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                VIN (Vehicle Identification Number)
              </div>
              <div className="text-base">
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-gray-50 font-mono text-sm">
                  <Hash className="h-4 w-4 mr-2 text-gray-400" />
                  {unit.vin}
                </span>
              </div>
            </div>
          )}

          {unit.description && (
            <div>
              <div className="text-xs text-muted-foreground uppercase mb-1">
                Description / Notes
              </div>
              <div className="text-base bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="whitespace-pre-wrap">{unit.description}</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-muted-foreground uppercase mb-1">
              Unit Summary
            </div>
            <div className="text-base bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-purple-800">
                <strong>{unit.name}</strong> is an active unit
                {unit.plateNumber && (
                  <span> with plate number <strong>{unit.plateNumber}</strong></span>
                )}
                {unit.color && (
                  <span> in <strong>{unit.color.toLowerCase()}</strong> color</span>
                )}
                {unit.vin && (
                  <span> (VIN: <strong>{unit.vin.slice(-8)}</strong>)</span>
                )}
                .
                {unit.description && (
                  <span> Additional notes are available for this unit.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions sticky">
        <div className="btn-group">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}