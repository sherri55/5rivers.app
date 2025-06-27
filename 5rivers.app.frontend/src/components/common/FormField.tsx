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
    <div className="space-y-1" style={{ marginBottom: '16px' }}>
      <Label
        htmlFor={id}
        className={
          required ? "after:content-['*'] after:text-red-500 after:ml-0.5" : ""
        }
        style={{ 
          display: 'block', 
          fontWeight: '500', 
          color: '#374151', 
          marginBottom: '4px',
          fontSize: '14px'
        }}
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
          className="mt-1"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'white',
            color: '#333',
            minHeight: '80px'
          }}
        />
      ) : type === "select" ? (
        <Select value={value?.toString()} onValueChange={onChange}>
          <SelectTrigger 
            className="mt-1"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '2px solid #374151',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: 'white',
              color: '#111827',
              minHeight: '40px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            <SelectValue 
              placeholder={placeholder} 
              style={{
                color: '#111827',
                fontWeight: '500'
              }}
            />
          </SelectTrigger>
          <SelectContent 
            className="max-h-60 overflow-y-auto"
            style={{
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              zIndex: 99999
            }}
          >
            {options.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                style={{
                  color: '#111827',
                  fontWeight: '500',
                  padding: '10px 12px'
                }}
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
          className="mt-1"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'white',
            color: '#333',
            minHeight: '40px'
          }}
        />
      )}

      {error && (
        <p 
          className="text-destructive text-sm mt-1"
          style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
