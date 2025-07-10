import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { parseISO } from 'date-fns';

const EST_TIMEZONE = 'America/New_York';

// Helper function to safely parse dates and return ISO strings in EST context
const parseDate = (dateValue: any): string | null => {
  if (!dateValue) return null;
  
  try {
    // If it's already a Date object, convert to ISO string
    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === 'string') {
      // Handle date-only strings by treating them as EST dates
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Parse the date as if it's in EST timezone, then convert to UTC for storage
        const estDate = fromZonedTime(`${dateValue} 00:00:00`, EST_TIMEZONE);
        return estDate.toISOString();
      }
      
      // Handle other date formats
      const parsedDate = new Date(dateValue);
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Invalid date format: ${dateValue}`);
        return null;
      }
      return parsedDate.toISOString();
    }
    
    // Handle Neo4j Date objects or other formats
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`Could not parse date: ${dateValue}`);
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.warn(`Error parsing date ${dateValue}:`, error);
    return null;
  }
};

// Helper function to format dates back to EST for display
const formatDateForDisplay = (dateValue: any): string | null => {
  if (!dateValue) return null;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Convert UTC date back to EST and format as YYYY-MM-DD
    const estDate = toZonedTime(date, EST_TIMEZONE);
    return format(estDate, 'yyyy-MM-dd', { timeZone: EST_TIMEZONE });
  } catch (error) {
    console.warn(`Error formatting date ${dateValue}:`, error);
    return null;
  }
};

console.log('Testing Date Functions:');
console.log('======================');

const testDate = '2025-07-01';
console.log(`Input date: ${testDate}`);

const parsedDate = parseDate(testDate);
console.log(`Parsed for storage (UTC): ${parsedDate}`);

const formattedDate = formatDateForDisplay(parsedDate);
console.log(`Formatted for display (EST): ${formattedDate}`);

// Test with current date
const now = new Date();
console.log(`\nCurrent date (UTC): ${now.toISOString()}`);
console.log(`Current date formatted for display (EST): ${formatDateForDisplay(now)}`);

// Test the problem case
const problemDate = '2025-07-01T04:00:00.000Z'; // This would be midnight EST stored as UTC
console.log(`\nProblem date (UTC): ${problemDate}`);
console.log(`Problem date formatted for display (EST): ${formatDateForDisplay(problemDate)}`);
