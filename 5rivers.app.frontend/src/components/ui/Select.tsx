import { FC, SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, options, fullWidth = false, className = "", ...props },
    ref
  ) => {
    const selectClasses = `
      block appearance-none rounded-md border-gray-300 shadow-sm
      focus:border-indigo-500 focus:ring-indigo-500
      disabled:opacity-50 disabled:bg-gray-100
      ${error ? "border-red-500" : "border-gray-300"}
      ${fullWidth ? "w-full" : ""}
      ${className}
    `;

    return (
      <div className={`${fullWidth ? "w-full" : ""} mb-4`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select ref={ref} className={selectClasses} {...props}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <ChevronDownIcon className="h-4 w-4" />
          </div>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
