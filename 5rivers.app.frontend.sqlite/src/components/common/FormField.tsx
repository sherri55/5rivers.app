"use client";

import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface FormFieldProps {
  id: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "textarea" | "select" | "date";
  value: string | number;
  onChange: (value: unknown) => void;
  placeholder?: string;
  required?: boolean;
  options?: Option[];
  error?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  options = [],
  error,
  min,
  max,
  step,
}: FormFieldProps) {
  return (
    <div className="space-y-2 mb-4">
      <Label
        htmlFor={id}
        className={`block text-sm font-medium text-gray-700 ${
          required ? "after:content-['*'] after:text-red-500 after:ml-0.5" : ""
        }`}
      >
        {label}
      </Label>

      {type === "textarea" ? (
        <Textarea
          id={id}
          value={value?.toString() ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 min-h-[80px] resize-vertical"
        />
      ) : type === "select" ? (
        <Select value={value?.toString()} onValueChange={onChange}>
          <SelectTrigger className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium">
            <SelectValue 
              placeholder={placeholder}
              className="text-gray-900 font-medium"
            />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {options.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                className="text-gray-900 font-medium px-3 py-2 hover:bg-gray-50 focus:bg-blue-50 cursor-pointer"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={type === "date" ? "date" : type}
          value={value === undefined || value === null ? "" : value.toString()}
          onChange={(e) => {
            let newValue: string | number = e.target.value;
            if (type === "number") {
              newValue = e.target.value === "" ? "" : Number(e.target.value);
              // If the input is not a valid number, fallback to empty string
              if (isNaN(newValue as number)) newValue = "";
            }
            onChange(newValue);
          }}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
          className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
        />
      )}

      {error && (
        <p className="text-red-600 text-xs font-medium mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
