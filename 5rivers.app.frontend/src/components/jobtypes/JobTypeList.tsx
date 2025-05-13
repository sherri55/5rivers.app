import { useEffect, useState } from "react";
import { jobTypeApi } from "@/src/lib/api";
import { Button } from "../ui/button";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";
import { ConfirmDialog } from "../common/Modal";
import { toast } from "sonner";

export function JobTypeList({ onSelect, onEdit, onCreate, onDelete, refresh }: any) {
  const [jobTypes, setJobTypes] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  useEffect(() => {
    jobTypeApi.fetchAll().then(setJobTypes);
  }, [refresh]);

  const handleDelete = async (id: string) => {
    try {
      await jobTypeApi.delete(id);
      setJobTypes(jobTypes.filter((jt: any) => jt.jobTypeId !== id));
      toast.success("Job Type deleted successfully");
      if (onDelete) onDelete(id);
    } catch (error: any) {
      toast.error("Failed to delete job type" + (error?.message || ""));
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-medium">Job Types</h2>
        <Button onClick={onCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Add Job Type
        </Button>
      </div>
      <ul className="divide-y">
        {jobTypes.map((jt: any) => (
          <li
            key={jt.jobTypeId}
            className="py-2 px-2 rounded flex items-center justify-between hover:bg-muted"
          >
            <span className="flex-1 cursor-pointer" onClick={() => onSelect(jt)}>
              {jt.title}
            </span>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={() => onSelect(jt)} title="View Details">
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); onEdit(jt); }} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(jt.jobTypeId)} className="text-destructive hover:text-destructive" title="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
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
