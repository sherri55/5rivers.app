"use client";

import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { FormField } from "@/src/components/common/FormField";
import { driverApi } from "@/src/lib/api";
import { toast } from "sonner";

interface Driver {
  driverId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  hourlyRate?: number;
}

interface DriverFormProps {
  driver?: Driver;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DriverForm({ driver, onSuccess, onCancel }: DriverFormProps) {
  const [name, setName] = useState(driver?.name || "");
  const [email, setEmail] = useState(driver?.email || "");
  const [phone, setPhone] = useState(driver?.phone || "");
  const [description, setDescription] = useState(driver?.description || "");
  const [hourlyRate, setHourlyRate] = useState<number>(driver?.hourlyRate || 0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (driver) {
      setName(driver.name);
      setEmail(driver.email);
      setPhone(driver.phone || "");
      setDescription(driver.description || "");
      setHourlyRate(driver.hourlyRate || 0);
    }
  }, [driver]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    if (hourlyRate < 0) {
      newErrors.hourlyRate = "Hourly rate cannot be negative";
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
      const driverData = {
        name,
        email,
        phone,
        description,
        hourlyRate,
      };

      if (driver?.driverId) {
        await driverApi.update(driver.driverId, driverData);
        toast.success("Driver updated successfully");
      } else {
        await driverApi.create(driverData);
        toast.success("Driver created successfully");
      }

      setLoading(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving driver:", error);
      toast.error(`Failed to ${driver ? "update" : "create"} driver`);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        id="name"
        label="Name"
        value={name}
        onChange={setName}
        placeholder="Enter driver name"
        required
        error={errors.name}
      />

      <FormField
        id="email"
        label="Email Address"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="Enter email address"
        required
        error={errors.email}
      />

      <FormField
        id="phone"
        label="Phone Number"
        type="tel"
        value={phone}
        onChange={setPhone}
        placeholder="Enter phone number"
      />

      <FormField
        id="hourlyRate"
        label="Hourly Rate"
        type="number"
        value={hourlyRate}
        onChange={setHourlyRate}
        placeholder="Enter hourly rate"
        min={0}
        step={0.01}
        error={errors.hourlyRate}
      />

      <FormField
        id="description"
        label="Description"
        type="textarea"
        value={description}
        onChange={setDescription}
        placeholder="Enter description"
      />

      <div className="flex justify-end gap-2 pt-4">
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
            driver
              ? "bg-orange-500 hover:bg-orange-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }
        >
          {loading ? "Saving..." : driver ? "Update Driver" : "Create Driver"}
        </Button>
      </div>
    </form>
  );
}
