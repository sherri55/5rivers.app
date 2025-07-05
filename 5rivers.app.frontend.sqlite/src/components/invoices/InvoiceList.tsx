import { useEffect, useState } from "react";
import { invoiceApi, dispatcherApi } from "@/src/lib/api";
import { parseLocalDate } from "@/src/lib/utils";
import { Button } from "../ui/button";
import {
  Pencil,
  Trash2,
  Plus,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  Search,
  Loader2,
} from "lucide-react";
import { DateRangePicker } from "../common/DateRangePicker";
import { Invoice } from "@/src/types/entities";

interface Dispatcher {
  dispatcherId: string;
  name: string;
}

interface InvoiceListProps {
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onCreate: () => void;
  refresh: number;
}

export function InvoiceList({
  onView,
  onEdit,
  onDelete,
  onCreate,
  refresh,
}: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]); // For search
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 20;

  // Filter state
  const [dispatcherId, setDispatcherId] = useState("");
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });

  // Load initial data
  const loadInvoices = async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const [invoicesResponse, dispatchersData] = await Promise.all([
        invoiceApi.fetchAll({
          page,
          pageSize: PAGE_SIZE,
          dispatcherId: dispatcherId || undefined,
          status: status || undefined,
        }),
        page === 1 ? dispatcherApi.fetchAll({ pageSize: 10000 }) : Promise.resolve(dispatchers),
      ]);

      if (page === 1) {
        setInvoices(Array.isArray(invoicesResponse.data) ? invoicesResponse.data : []);
        setDispatchers(Array.isArray(dispatchersData) ? dispatchersData : []);
      } else {
        setInvoices(prev => [...prev, ...(Array.isArray(invoicesResponse.data) ? invoicesResponse.data : [])]);
      }

      setCurrentPage(invoicesResponse.page || 1);
      setTotalPages(invoicesResponse.totalPages || 1);
      setHasMore((invoicesResponse.page || 1) < (invoicesResponse.totalPages || 1));

      // Load all invoices for search if we don't have them yet
      if (allInvoices.length === 0 && !searchQuery) {
        const allInvoicesResponse = await invoiceApi.fetchAll({
          pageSize: 10000, // Large number to get all
        });
        setAllInvoices(Array.isArray(allInvoicesResponse.data) ? allInvoicesResponse.data : []);
      }
    } catch (err) {
      setError("Failed to load invoices");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadInvoices(1, false);
  }, [refresh, dispatcherId, status]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        // Filter from all invoices for immediate search results
        const filtered = (Array.isArray(allInvoices) ? allInvoices : []).filter(invoice => 
          invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.billedTo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.billedEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.dispatcher?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setInvoices(filtered);
        setHasMore(false);
      } else {
        // Reset to paginated results
        loadInvoices(1, false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, allInvoices]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !searchQuery) {
      loadInvoices(currentPage + 1, true);
    }
  };

  // Apply date range filtering
  const dateFilteredInvoices = (Array.isArray(invoices) ? invoices : []).filter((invoice) => {
    if (dateRange.startDate && parseLocalDate(invoice.invoiceDate) < dateRange.startDate)
      return false;
    if (dateRange.endDate && parseLocalDate(invoice.invoiceDate) > dateRange.endDate)
      return false;
    return true;
  });

  // Grouping logic: by month in reverse chronological order
  function groupInvoicesByMonth(invoices: Invoice[]) {
    const monthGroups: Record<string, Invoice[]> = {};
    
    (Array.isArray(invoices) ? invoices : []).forEach((invoice) => {
      const date = invoice.invoiceDate ? parseLocalDate(invoice.invoiceDate) : null;
      if (!date) return;
      
      // Format as "Month YYYY" (e.g., "June 2025")
      const monthYear = date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!monthGroups[monthYear]) monthGroups[monthYear] = [];
      monthGroups[monthYear].push(invoice);
    });

    // Sort months in reverse chronological order
    const sortedMonths = Object.keys(monthGroups).sort((a, b) => {
      const dateA = new Date(a + " 1");
      const dateB = new Date(b + " 1");
      return dateB.getTime() - dateA.getTime();
    });

    return sortedMonths.map((month) => ({
      month,
      invoices: monthGroups[month].sort((a, b) => {
        // Sort invoices within month by date (newest first)
        const dateA = parseLocalDate(a.invoiceDate);
        const dateB = parseLocalDate(b.invoiceDate);
        return dateB.getTime() - dateA.getTime();
      }),
    }));
  }

  const groupedInvoices = groupInvoicesByMonth(dateFilteredInvoices);

  const formatCurrency = (value?: number | string) => {
    if (value === undefined || value === null) return "—";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "—";
    return `$${numValue.toFixed(2)}`;
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'sent':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'draft':
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'sent':
        return 'text-blue-600 bg-blue-50';
      case 'draft':
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading invoices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-wrap gap-2 items-end">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="pl-8 border rounded px-2 py-1 min-w-[200px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filters */}
          <select
            className="border rounded px-2 py-1 min-w-[160px]"
            value={dispatcherId}
            onChange={(e) => setDispatcherId(e.target.value)}
          >
            <option value="">All Dispatchers</option>
            {dispatchers.map((d) => (
              <option key={d.dispatcherId} value={d.dispatcherId}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-2 py-1 min-w-[120px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Paid">Paid</option>
          </select>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <div className="flex-1" />
          <Button
            onClick={onCreate}
            className="gap-1 whitespace-nowrap self-stretch"
          >
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        </div>
      </div>

      {groupedInvoices.length === 0 && (
        <div className="text-muted-foreground py-8 text-center">
          {searchQuery ? "No invoices found matching your search." : "No invoices found."}
        </div>
      )}

      {groupedInvoices.map(({ month, invoices }) => (
        <div key={month} className="mb-6">
          <div className="font-semibold text-lg mb-3 text-foreground border-b pb-1">
            {month}
          </div>
          <div className="space-y-1">
            {invoices.map((invoice) => (
              <div
                key={invoice.invoiceId}
                className="py-3 px-4 rounded-lg flex items-center justify-between hover:bg-muted cursor-pointer border border-border"
                onClick={() => onView(invoice)}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Status indicator */}
                  <div className="flex items-center gap-2">
                    {getStatusIcon(invoice.status)}
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  
                  {/* Invoice info */}
                  <div className="flex-1">
                    <div className="font-medium">
                      {invoice.invoiceNumber} - {parseLocalDate(invoice.invoiceDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.billedTo || "No Client"} • {invoice.dispatcher?.name || "No Dispatcher"}
                      {invoice.billedEmail && ` • ${invoice.billedEmail}`}
                    </div>
                  </div>
                  
                  {/* Amount and status */}
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(invoice.total)}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status || "Draft"}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(invoice);
                    }}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(invoice);
                    }}
                    className="text-destructive hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Load More Button */}
      {hasMore && !searchQuery && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            variant="outline"
            className="gap-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>Load More ({(totalPages - currentPage) * PAGE_SIZE}+ remaining)</>
            )}
          </Button>
        </div>
      )}

      {/* Search result count */}
      {searchQuery && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          {dateFilteredInvoices.length} result{dateFilteredInvoices.length !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
}
