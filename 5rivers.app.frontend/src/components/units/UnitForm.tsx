"use client";

import { useState, useEffect } from "react";
import { FormField } from "@/src/components/common/FormField";
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
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <FormField
        id="description"
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="Enter description"
      />

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className={
            unit
              ? "bg-orange-500 hover:bg-orange-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }
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
    </form>
  );
}
