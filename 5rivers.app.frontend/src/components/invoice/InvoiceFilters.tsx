"use client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";

interface Filters {
  start: string;
  end: string;
  dispatcher: string;
  company: string;
  unit: string;
}
interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  dispatchers: { dispatcherId: string; name: string }[];
  companies: { companyId: string; name: string }[];
  units: { unitId: string; name: string }[];
}
export function InvoiceFilters({
  filters,
  setFilters,
  dispatchers,
  companies,
  units,
}: Props) {
  return (
    <CollapsiblePanel title="Filters">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          type="date"
          label="Start Date"
          value={filters.start}
          onChange={(e) => setFilters({ ...filters, start: e.target.value })}
          fullWidth
        />
        <Input
          type="date"
          label="End Date"
          value={filters.end}
          onChange={(e) => setFilters({ ...filters, end: e.target.value })}
          fullWidth
        />
        <Select
          label="Dispatcher"
          value={filters.dispatcher}
          onChange={(e) =>
            setFilters({ ...filters, dispatcher: e.target.value })
          }
          options={[
            { value: "", label: "All Dispatchers" },
            ...dispatchers.map((d) => ({
              value: d.dispatcherId,
              label: d.name,
            })),
          ]}
          fullWidth
        />
        <Select
          label="Company"
          value={filters.company}
          onChange={(e) => setFilters({ ...filters, company: e.target.value })}
          options={[
            { value: "", label: "All Companies" },
            ...companies.map((c) => ({ value: c.companyId, label: c.name })),
          ]}
          fullWidth
        />
        <Select
          label="Unit"
          value={filters.unit}
          onChange={(e) => setFilters({ ...filters, unit: e.target.value })}
          options={[
            { value: "", label: "All Units" },
            ...units.map((u) => ({ value: u.unitId, label: u.name })),
          ]}
          fullWidth
        />
      </div>
    </CollapsiblePanel>
  );
}
