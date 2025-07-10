import { parseISO, format as formatDate, isSameDay } from 'date-fns';

/**
 * Parses a date string received from the backend and returns a Date object
 * The backend sends dates in YYYY-MM-DD format representing EST dates
 */
export const parseBackendDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  
  try {
    // If it's just a date string (YYYY-MM-DD), treat it as a local date
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Create a date object treating the date as local time (not UTC)
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed in JS Date
    }
    
    // For full ISO dates, parse normally
    return parseISO(dateString);
  } catch (error) {
    console.warn(`Error parsing backend date: ${dateString}`, error);
    return null;
  }
};

/**
 * Formats a date for display in the UI
 */
export const formatDateForDisplay = (date: Date | string | null | undefined, formatString: string = 'PPP'): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseBackendDate(date) : date;
    if (!dateObj) return '';
    
    return formatDate(dateObj, formatString);
  } catch (error) {
    console.warn(`Error formatting date for display: ${date}`, error);
    return '';
  }
};

/**
 * Formats a date for sending to the backend (YYYY-MM-DD format)
 */
export const formatDateForBackend = (date: Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn(`Error formatting date for backend: ${date}`, error);
    return '';
  }
};

/**
 * Gets the current date in YYYY-MM-DD format for form inputs
 */
export const getCurrentDateString = (): string => {
  return formatDateForBackend(new Date());
};

/**
 * Formats a time string for display (HH:mm:ss)
 */
export const formatTimeForDisplay = (timeString: string | null | undefined): string => {
  if (!timeString) return '';
  
  try {
    // If it's already in HH:mm:ss format, return as is
    if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
      return timeString;
    }
    
    // If it's an ISO datetime string, extract time only
    const date = parseISO(timeString);
    return formatDate(date, 'HH:mm:ss');
  } catch (error) {
    console.warn(`Error formatting time for display: ${timeString}`, error);
    return '';
  }
};

/**
 * Formats a time range for display, handling overnight jobs
 */
export const formatTimeRange = (
  startTime: string | null | undefined, 
  endTime: string | null | undefined
): string => {
  if (!startTime) return '';
  
  const formattedStartTime = formatTimeForDisplay(startTime);
  if (!endTime) {
    return `${formattedStartTime} - Ongoing`;
  }
  
  const formattedEndTime = formatTimeForDisplay(endTime);
  
  // Check if this is an overnight job by parsing the full datetime
  try {
    if (startTime.includes('T') && endTime.includes('T')) {
      const startDate = parseISO(startTime);
      const endDate = parseISO(endTime);
      
      // If end date is next day, show dates
      if (!isSameDay(startDate, endDate)) {
        const startDateStr = formatDate(startDate, 'MMM d');
        const endDateStr = formatDate(endDate, 'MMM d');
        return `${startDateStr} ${formattedStartTime} - ${endDateStr} ${formattedEndTime}`;
      }
    }
  } catch (error) {
    // Fall back to time-only display
  }
  
  return `${formattedStartTime} - ${formattedEndTime}`;
};

/**
 * Checks if a weight value should be displayed (not empty or zero)
 */
export const shouldDisplayWeight = (weight: number[] | string | null | undefined): boolean => {
  if (!weight) return false;
  
  // Handle array format (from GraphQL)
  if (Array.isArray(weight)) {
    return weight.length > 0 && weight.some(w => w > 0);
  }
  
  // Handle string format (legacy or converted)
  if (typeof weight === 'string') {
    const trimmed = weight.trim();
    return trimmed !== '' && trimmed !== '0';
  }
  
  return false;
};

/**
 * Formats weight for display, returning empty string if invalid
 */
export const formatWeightForDisplay = (weight: number[] | string | null | undefined): string => {
  if (!shouldDisplayWeight(weight)) return '';
  
  // Handle array format (from GraphQL)
  if (Array.isArray(weight)) {
    const validWeights = weight.filter(w => w > 0);
    if (validWeights.length === 0) return '';
    if (validWeights.length === 1) return validWeights[0].toString();
    return validWeights.join(', ');
  }
  
  // Handle string format (legacy or converted)
  if (typeof weight === 'string') {
    return weight.trim();
  }
  
  return '';
};
