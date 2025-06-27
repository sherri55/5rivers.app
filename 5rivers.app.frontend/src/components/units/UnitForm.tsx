"use client";

import { useState, useEffect } from "react";
import { FormField } from "@/src/components/common/FormField";
import { Button } from "@/src/components/ui/button";
import { unitApi } from "@/src/lib/api";
import { toast } from "sonner";

interface Unit {
  unitId: string;
  name: string;
  plateNumber?: string;
  vin?: string;
  color?: string;
  description?: string;
}

interface UnitFormProps {
  unit?: Unit;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UnitForm({ unit, onSuccess, onCancel }: UnitFormProps) {
  const [name, setName] = useState(unit?.name || "");
  const [plateNumber, setPlateNumber] = useState(unit?.plateNumber || "");
  const [vin, setVin] = useState(unit?.vin || "");
  const [color, setColor] = useState(unit?.color || "");
  const [description, setDescription] = useState(unit?.description || "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (unit) {
      setName(unit.name);
      setPlateNumber(unit.plateNumber || "");
      setVin(unit.vin || "");
      setColor(unit.color || "");
      setDescription(unit.description || "");
    }
  }, [unit]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const unitData = {
        name,
        plateNumber,
        vin,
        color,
        description,
      };

      if (unit?.unitId) {
        await unitApi.update(unit.unitId, unitData);
        toast.success("Unit updated successfully");
      } else {
        await unitApi.create(unitData);
        toast.success("Unit created successfully");
      }

      setLoading(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving unit:", error);
      toast.error(`Failed to ${unit ? "update" : "create"} unit`);
      setLoading(false);
    }
  };

  return (
    <div className="slide-over-form">
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-row-2">
            <FormField
              id="name"
              label="Unit Name"
              value={name}
              onChange={setName}
              placeholder="Enter unit name"
              required
              error={errors.name}
            />

            <FormField
              id="plateNumber"
              label="Plate Number"
              value={plateNumber}
              onChange={setPlateNumber}
              placeholder="Enter plate number"
            />
          </div>

          <div className="form-row-2">
            <FormField
              id="vin"
              label="VIN"
              value={vin}
              onChange={setVin}
              placeholder="Enter VIN"
            />

            <FormField
              id="color"
              label="Color"
              value={color}
              onChange={setColor}
              placeholder="Enter color"
            />
          </div>

          <FormField
            id="description"
            label="Description"
            type="textarea"
            value={description}
            onChange={setDescription}
            placeholder="Enter description"
          />
        </div>

        <div className="form-actions sticky">
          <div className="btn-group">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              style={{
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                color: '#374151',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: unit ? '#f97316' : '#2563eb',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {loading
                ? unit
                  ? "Updating..."
                  : "Creating..."
                : unit
                ? "Update Unit"
                : "Create Unit"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
