"use client";

import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface FormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select';
  value: string | number;
  onChange: (value: any) => void;
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
  type = 'text',
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
    <div className="space-y-1">
      <Label htmlFor={id} className={required ? "after:content-['*'] after:text-red-500 after:ml-0.5" : ""}>
        {label}
      </Label>
      
      {type === 'textarea' ? (
        <Textarea
          id={id}
          value={value?.toString() ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="mt-1"
        />
      ) : type === 'select' ? (
        <Select value={value?.toString()} onValueChange={onChange}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={type}
          value={value?.toString() ?? ''}
          onChange={(e) => {
            const newValue = type === 'number' ? parseFloat(e.target.value) : e.target.value;
            onChange(newValue);
          }}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
          className="mt-1"
        />
      )}
      
      {error && <p className="text-destructive text-sm mt-1">{error}</p>}
    </div>
  );
}