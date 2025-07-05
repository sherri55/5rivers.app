import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string (YYYY-MM-DD) as a local date (no time zone shift).
 * Returns a Date object at local midnight.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date('Invalid Date');
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
