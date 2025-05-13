export function InvoiceDetails({ invoice, onDelete, onEdit }: any) {
  if (!invoice) return null;
  return (
    <div className="border rounded p-4 bg-card">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-bold">Invoice #{invoice.invoiceNumber}</h3>
        <div>
          <button className="btn btn-sm btn-outline mr-2" onClick={onEdit}>Edit</button>
          <button className="btn btn-sm btn-destructive" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        <div>Date: {invoice.invoiceDate}</div>
        <div>Status: {invoice.status}</div>
        <div>Dispatcher: {invoice.dispatcherId}</div>
        <div>Billed To: {invoice.billedTo}</div>
        <div>Billed Email: {invoice.billedEmail}</div>
        <div>SubTotal: {invoice.subTotal}</div>
        <div>Commission: {invoice.commission}</div>
        <div>HST: {invoice.hst}</div>
        <div>Total: {invoice.total}</div>
      </div>
    </div>
  );
}
