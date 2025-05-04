"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { FormField } from "../../components/common/FormField";
import { dispatcherApi } from "@/lib/api";
import { toast } from "sonner";

interface Dispatcher {
  dispatcherId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  commissionPercentage?: number;
}

interface DispatcherFormProps {
  dispatcher?: Dispatcher;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DispatcherForm({ dispatcher, onSuccess, onCancel }: DispatcherFormProps) {
  const [name, setName] = useState(dispatcher?.name || "");
  const [email, setEmail] = useState(dispatcher?.email || "");
  const [phone, setPhone] = useState(dispatcher?.phone || "");
  const [description, setDescription] = useState(dispatcher?.description || "");
  const [commissionPercentage, setCommissionPercentage] = useState<number>(
    dispatcher?.commissionPercentage || 0
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (dispatcher) {
      setName(dispatcher.name);
      setEmail(dispatcher.email);
      setPhone(dispatcher.phone || "");
      setDescription(dispatcher.description || "");
      setCommissionPercentage(dispatcher.commissionPercentage || 0);
    }
  }, [dispatcher]);

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

    if (commissionPercentage < 0 || commissionPercentage > 100) {
      newErrors.commissionPercentage = "Commission must be between 0% and 100%";
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
      const dispatcherData = {
        name,
        email,
        phone,
        description,
        commissionPercentage,
      };

      if (dispatcher?.dispatcherId) {
        await dispatcherApi.update(dispatcher.dispatcherId, dispatcherData);
        toast.success("Dispatcher updated successfully");
      } else {
        await dispatcherApi.create(dispatcherData);
        toast.success("Dispatcher created successfully");
      }

      setLoading(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving dispatcher:", error);
      toast.error(`Failed to ${dispatcher ? "update" : "create"} dispatcher`);
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
        placeholder="Enter dispatcher name"
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
        id="commissionPercentage"
        label="Commission Percentage"
        type="number"
        value={commissionPercentage}
        onChange={setCommissionPercentage}
        placeholder="Enter commission percentage"
        min={0}
        max={100}
        step={0.1}
        error={errors.commissionPercentage}
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
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : dispatcher
            ? "Update Dispatcher"
            : "Create Dispatcher"}
        </Button>
      </div>
    </form>
  );
}