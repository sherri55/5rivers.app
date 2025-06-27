"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Input } from "@/src/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/src/components/ui/alert";
import { Search } from "lucide-react";

export interface Column<T> {
  header: string;
  accessorKey: keyof T | ((row: T) => unknown);
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchField?: keyof T;
  loading?: boolean;
  error?: string;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  searchField,
  loading = false,
  error = "",
  searchPlaceholder = "Search...",
  emptyTitle = "No Data",
  emptyDescription = "There are no records to display.",
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  // Filter data based on search
  const filteredData = searchField
    ? data.filter((item) => {
        const fieldValue = String(item[searchField] || "").toLowerCase();
        return fieldValue.includes(search.toLowerCase());
      })
    : data;

  const renderCell = (row: T, column: Column<T>): React.ReactNode => {
    if (column.cell) {
      return column.cell(row);
    }

    const accessValue =
      typeof column.accessorKey === "function"
        ? column.accessorKey(row)
        : row[column.accessorKey as keyof T];

    return String(accessValue ?? "—");
  };

  return (
    <div>
      {searchField && (
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-72">
            <span className="absolute left-2 top-2.5 text-muted-foreground">
              <Search className="w-4 h-4" />
            </span>
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 flex justify-center items-center text-muted-foreground">
          <span className="animate-pulse">Loading data…</span>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : filteredData.length === 0 ? (
        <Alert variant="default" className="mt-8">
          <AlertTitle>{emptyTitle}</AlertTitle>
          <AlertDescription>{emptyDescription}</AlertDescription>
        </Alert>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                onClick={() => onRowClick?.(row)}
                className="cursor-pointer hover:bg-muted"
              >
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex}>
                    {renderCell(row, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
