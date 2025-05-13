export function JobTypeDetails({ jobType, onDelete, onEdit }: any) {
  if (!jobType) return null;
  return (
    <div className="border rounded p-4 bg-card">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-bold">{jobType.title}</h3>
        <div>
          <button className="btn btn-sm btn-outline mr-2" onClick={onEdit}>Edit</button>
          <button className="btn btn-sm btn-destructive" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        <div>Start Location: {jobType.startLocation}</div>
        <div>End Location: {jobType.endLocation}</div>
        <div>Dispatch Type: {jobType.dispatchType}</div>
        <div>Rate: {jobType.rateOfJob}</div>
        <div>Company ID: {jobType.companyId}</div>
        <div>Dispatcher ID: {jobType.dispatcherId}</div>
      </div>
    </div>
  );
}
