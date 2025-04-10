import { FC, ReactNode } from "react";

interface TableProps {
  headers: string[];
  children: ReactNode;
  isLoading?: boolean;
  emptyState?: ReactNode;
}

export const Table: FC<TableProps> = ({
  headers,
  children,
  isLoading = false,
  emptyState,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 border-t border-gray-200 bg-gray-100"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {children}
          </tbody>
        </table>
      </div>
      {!children && emptyState && (
        <div className="p-8 text-center">{emptyState}</div>
      )}
    </div>
  );
};
