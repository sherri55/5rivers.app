import { useEffect, useState } from "react";
import { jobTypeApi, companyApi } from "@/src/lib/api";
import { Company, JobType } from "@/src/types/entities";
import { Button } from "../ui/button";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { ConfirmDialog } from "../common/Modal";
import { toast } from "sonner";

export function JobTypeList({
  onSelect,
  onEdit,
  onCreate,
  onDelete,
  refresh,
}: {
  onSelect: (jt: JobType) => void;
  onEdit: (jt: JobType) => void;
  onCreate: () => void;
  onDelete?: (id: string) => void;
  refresh?: any;
}) {
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [dispatchType, setDispatchType] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    jobTypeApi.fetchAll().then((data: JobType[]) => {
      setJobTypes(data.slice().sort((a, b) => a.title.localeCompare(b.title)));
    });
    companyApi.fetchAll().then((data: Company[]) => {
      setCompanies(data);
    });
  }, [refresh]);

  // Filtering
  const filtered = jobTypes.filter((jt: JobType) => {
    if (companyId && jt.companyId !== companyId) return false;
    if (dispatchType && jt.dispatchType !== dispatchType) return false;
    if (search && !jt.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  // Group by company name
  const grouped: Record<string, JobType[]> = {};
  filtered.forEach((jt: JobType) => {
    const company = companies.find((c) => c.companyId === jt.companyId);
    const groupName = company ? company.name : "No Company";
    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(jt);
  });
  const sortedCompanyNames = Object.keys(grouped).sort();

  const handleDelete = async (id: string) => {
    try {
      setJobTypes(jobTypes.filter((jt) => jt.jobTypeId !== id));
      await jobTypeApi.delete(id);
      toast.success("Job Type deleted successfully");
      if (onDelete) onDelete(id);
    } catch (error) {
      toast.error("Failed to delete job type");
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-wrap gap-2 items-end">
          <select
            className="border rounded px-2 py-1 min-w-[160px]"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.companyId} value={c.companyId}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 min-w-[160px]"
            value={dispatchType}
            onChange={(e) => setDispatchType(e.target.value)}
          >
            <option value="">All Dispatch Types</option>
            <option value="Hourly">Hourly</option>
            <option value="Tonnage">Tonnage</option>
            <option value="Load">Load</option>
            <option value="Fixed">Fixed</option>
          </select>
          <input
            className="border rounded px-2 py-1 min-w-[160px]"
            type="text"
            placeholder="Search Job Types"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex-1" />
          <Button
            onClick={onCreate}
            className="gap-1 whitespace-nowrap self-stretch"
          >
            <Plus className="h-4 w-4" /> Add Job Type
          </Button>
        </div>
      </div>
      {sortedCompanyNames.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          No job types found.
        </div>
      )}
      {sortedCompanyNames.map((companyName) => (
        <div key={companyName} className="mb-6">
          <div className="font-semibold text-base mb-2">{companyName}</div>
          <ul className="divide-y">
            {grouped[companyName].map((jt) => (
              <li
                key={jt.jobTypeId}
                className="py-2 px-2 rounded flex items-center justify-between hover:bg-muted"
              >
                <span
                  className="flex-1 cursor-pointer"
                  onClick={() => onSelect(jt)}
                >
                  {jt.title}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onSelect(jt)}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(jt);
                    }}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setConfirmDelete(jt.jobTypeId!)}
                    className="text-destructive hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <ConfirmDialog
        title="Delete Job Type"
        message="Are you sure you want to delete this job type? This action cannot be undone."
        isOpen={!!confirmDelete}
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
