import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createUnit, updateUnit } from "@/lib/unitApi";

export function UnitForm({ unit, onSuccess, onCancel }) {
  const [name, setName] = useState(unit?.name || "");
  const [description, setDescription] = useState(unit?.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(unit?.name || "");
    setDescription(unit?.description || "");
  }, [unit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (unit) {
        await updateUnit(unit.unitId, { name, description });
      } else {
        await createUnit({ name, description });
      }
      setLoading(false);
      if (onSuccess) onSuccess();
    } catch {
      setError("Failed to save unit");
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6 max-w-md mx-auto" onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="name">Unit Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter unit name"
          className="mt-1"
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description"
          className="mt-1"
        />
      </div>
      {error && <div className="text-destructive text-sm">{error}</div>}
      <div className="flex gap-2">
        <Button type="submit" className="w-full" disabled={loading}>
          {unit ? "Update" : "Create"} Unit
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
