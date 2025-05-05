"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { FormField } from "../../components/common/FormField";
import { companyApi } from "@/src/lib/api";
import { toast } from "sonner";

interface Company {
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
}

interface CompanyFormProps {
  company?: Company;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CompanyForm({
  company,
  onSuccess,
  onCancel,
}: CompanyFormProps) {
  const [name, setName] = useState(company?.name || "");
  const [email, setEmail] = useState(company?.email || "");
  const [phone, setPhone] = useState(company?.phone || "");
  const [description, setDescription] = useState(company?.description || "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (company) {
      setName(company.name);
      setEmail(company.email);
      setPhone(company.phone || "");
      setDescription(company.description || "");
    }
  }, [company]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Company name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Invalid email format";
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
      const companyData = {
        name,
        email,
        phone,
        description,
      };

      if (company?.companyId) {
        await companyApi.update(company.companyId, companyData);
        toast.success("Company updated successfully");
      } else {
        await companyApi.create(companyData);
        toast.success("Company created successfully");
      }

      setLoading(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving company:", error);
      toast.error(`Failed to ${company ? "update" : "create"} company`);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        id="name"
        label="Company Name"
        value={name}
        onChange={setName}
        placeholder="Enter company name"
        required
        error={errors.name}
      />

      <FormField
        id="email"
        label="Email Address"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="Enter company email"
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
        error={errors.phone}
      />

      <FormField
        id="description"
        label="Description"
        type="textarea"
        value={description}
        onChange={setDescription}
        placeholder="Enter company description"
        error={errors.description}
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
            : company
            ? "Update Company"
            : "Create Company"}
        </Button>
      </div>
    </form>
  );
}
