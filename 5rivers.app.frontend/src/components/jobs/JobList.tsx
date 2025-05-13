import { useEffect, useState } from "react";
import { jobApi, dispatcherApi, unitApi, jobTypeApi } from "@/src/lib/api";
import { Button } from "../ui/button";
import { Eye, Pencil, Trash2, Plus, CheckCircle2, Clock3, MinusCircle } from "lucide-react";
import { ConfirmDialog } from "../common/Modal";
import { toast } from "sonner";

export function JobList({ onSelect, onEdit, onCreate, onDelete, refresh }: any) {
  const [jobs, setJobs] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);
  const [units, setUnits] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Filter state
  const [dispatcherId, setDispatcherId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");

  useEffect(() => {
    jobApi.fetchAll().then(setJobs);
    dispatcherApi.fetchAll().then(setDispatchers);
    unitApi.fetchAll().then(setUnits);
    jobTypeApi.fetchAll().then(setJobTypes);
  }, [refresh]);

  const handleDelete = async (id: string) => {
    try {
      await jobApi.delete(id);
      setJobs(jobs.filter((job: any) => job.jobId !== id));
      toast.success("Job deleted successfully");
      if (onDelete) onDelete(id);
    } catch (error: any) {
      toast.error("Failed to delete job" + (error?.message || ""));
    }
  };

  // Filtering logic
  const filteredJobs = jobs.filter((job: any) => {
    if (dispatcherId && job.dispatcher?.dispatcherId !== dispatcherId) return false;
    if (unitId && job.unit?.unitId !== unitId) return false;
    if (startLocation && job.jobType?.startLocation !== startLocation) return false;
    if (endLocation && job.jobType?.endLocation !== endLocation) return false;
    return true;
  });

  // Grouping logic: by month (descending) and unit type
  function groupJobs(jobs: any[]) {
    // Group by year-month
    const monthGroups: Record<string, any[]> = {};
    jobs.forEach(job => {
      const date = job.jobDate ? new Date(job.jobDate) : null;
      if (!date) return;
      const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthGroups[ym]) monthGroups[ym] = [];
      monthGroups[ym].push(job);
    });
    // Sort months descending
    const sortedMonths = Object.keys(monthGroups).sort((a, b) => b.localeCompare(a));
    // For each month, group by unit type
    return sortedMonths.map(month => {
      const jobsInMonth = monthGroups[month];
      const unitTypeGroups: Record<string, any[]> = {};
      jobsInMonth.forEach(job => {
        const unitType = job.unit?.name || "Unknown Unit";
        if (!unitTypeGroups[unitType]) unitTypeGroups[unitType] = [];
        unitTypeGroups[unitType].push(job);
      });
      const sortedUnitTypes = Object.keys(unitTypeGroups).sort();
      return {
        month,
        unitTypes: sortedUnitTypes.map(unitType => ({
          unitType,
          jobs: unitTypeGroups[unitType],
        })),
      };
    });
  }

  const grouped = groupJobs(filteredJobs);

  // For start/end location filter options
  const startLocations = Array.from(new Set(jobTypes.map((jt: any) => jt.startLocation).filter(Boolean)));
  const endLocations = Array.from(new Set(jobTypes.map((jt: any) => jt.endLocation).filter(Boolean)));

  return (
    <div>
      <div className="flex flex-wrap gap-4 justify-between mb-4 items-end">
        <h2 className="text-lg font-medium">Jobs</h2>
        <div className="flex gap-2 flex-wrap">
          <select className="border rounded px-2 py-1" value={dispatcherId} onChange={e => setDispatcherId(e.target.value)}>
            <option value="">All Dispatchers</option>
            {dispatchers.map((d: any) => (
              <option key={d.dispatcherId} value={d.dispatcherId}>{d.name}</option>
            ))}
          </select>
          <select className="border rounded px-2 py-1" value={unitId} onChange={e => setUnitId(e.target.value)}>
            <option value="">All Units</option>
            {units.map((u: any) => (
              <option key={u.unitId} value={u.unitId}>{u.name}</option>
            ))}
          </select>
          <select className="border rounded px-2 py-1" value={startLocation} onChange={e => setStartLocation(e.target.value)}>
            <option value="">All Start Locations</option>
            {startLocations.map((loc: string) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <select className="border rounded px-2 py-1" value={endLocation} onChange={e => setEndLocation(e.target.value)}>
            <option value="">All End Locations</option>
            {endLocations.map((loc: string) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <Button onClick={onCreate} className="gap-1">
            <Plus className="h-4 w-4" /> Add Job
          </Button>
        </div>
      </div>
      {grouped.length === 0 && <div className="text-muted-foreground py-8 text-center">No jobs found.</div>}
      {grouped.map(({ month, unitTypes }) => (
        <div key={month} className="mb-6">
          <div className="font-semibold text-base mb-2">{month.replace("-", ".")}</div>
          {unitTypes.map(({ unitType, jobs }) => (
            <div key={unitType} className="mb-2">
              <div className="text-sm text-muted-foreground mb-1">{unitType}</div>
              <ul className="divide-y">
                {jobs.map((job: any) => (
                  <li
                    key={job.jobId}
                    className="py-2 px-2 rounded flex items-center justify-between hover:bg-muted"
                  >
                    {/* Status indicator */}
                    <span className="mr-2 flex items-center">
                      {job.status === "Complete" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" title="Complete" />
                      ) : job.status === "Pending" ? (
                        <Clock3 className="h-5 w-5 text-yellow-500" title="Pending" />
                      ) : (
                        <MinusCircle className="h-5 w-5 text-gray-400" title={job.status || "Unknown"} />
                      )}
                    </span>
                    <span className="flex-1 cursor-pointer" onClick={() => onSelect(job)}>
                      {job.jobDate ? new Date(job.jobDate).toISOString().slice(0, 10).replace(/-/g, ".") : ""} - {job.dispatcher?.name || "No Dispatcher"}
                    </span>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => onSelect(job)} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); onEdit(job); }} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(job.jobId)} className="text-destructive hover:text-destructive" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
      <ConfirmDialog
        title="Delete Job"
        message="Are you sure you want to delete this job? This action cannot be undone."
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
