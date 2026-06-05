import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to DD/MM/YYYY format
 * @param dateString - Date string or Date object
 * @returns Formatted date string in DD/MM/YYYY format or "N/A" if invalid
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A"
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    if (isNaN(date.getTime())) return "N/A"
    
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear())
    
    return `${day}/${month}/${year}`
  } catch {
    return "N/A"
  }
}

/**
 * Convert YYYY-MM-DD or ISO date string format to DD/MM/YYYY format
 * @param dateStr - Date string in YYYY-MM-DD or ISO format (e.g., "2026-01-01T00:00:00")
 * @returns Formatted date string in DD/MM/YYYY format or empty string if invalid
 */
export function formatDateInput(dateStr: string | Date): string {
  if (!dateStr) return ""
  
  try {
    let date: Date
    
    if (dateStr instanceof Date) {
      date = dateStr
    } else {
      // Handle YYYY-MM-DD format - parse as local date to avoid timezone issues
      const parts = dateStr.split('T')[0].split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
        const day = parseInt(parts[2], 10)
        date = new Date(year, month, day)
      } else {
        date = new Date(dateStr)
      }
    }
    
    if (isNaN(date.getTime())) return ""
    
    // Use local date methods to avoid timezone conversion
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear())
    
    return `${day}/${month}/${year}`
  } catch {
    return ""
  }
}

/**
 * Convert DD/MM/YYYY format to YYYY-MM-DD format
 * @param dateStr - Date string in DD/MM/YYYY format
 * @returns Date string in YYYY-MM-DD format or empty string if invalid
 */
export function parseDateInput(dateStr: string): string {
  if (!dateStr) return ""
  
  try {
    // Remove any non-digit characters except /
    const cleaned = dateStr.replace(/[^\d/]/g, '')
    const parts = cleaned.split('/')
    
    if (parts.length !== 3) return ""
    
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    let year = parseInt(parts[2], 10)
    
    // If year is 2 digits, convert to 4 digits (assuming 2000-2099)
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year
    }
    
    // Validate date
    if (isNaN(day) || isNaN(month) || isNaN(year)) return ""
    if (day < 1 || day > 31 || month < 1 || month > 12) return ""
    
    // Create date in local timezone to avoid timezone conversion issues
    const date = new Date(year, month - 1, day)
    if (isNaN(date.getTime())) return ""
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return "" // Invalid date (e.g., Feb 30)
    }
    
    const yyyy = String(year)
    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return ""
  }
}

/**
 * Convert a Date object to YYYY-MM-DD format using local date (no timezone conversion)
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format or empty string if invalid
 */
export function formatDateToLocalString(date: Date): string {
  if (!date || isNaN(date.getTime())) return ""
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Format date input with automatic slashes (DD/MM/YYYY)
 * @param value - Current input value
 * @returns Formatted string with slashes
 */
export function formatDateInputValue(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '')
  
  // Limit to 8 digits (DD/MM/YYYY)
  const limitedDigits = digits.slice(0, 8)
  
  // Add slashes at appropriate positions
  if (limitedDigits.length <= 2) {
    return limitedDigits
  } else if (limitedDigits.length <= 4) {
    return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`
  } else {
    return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2, 4)}/${limitedDigits.slice(4, 8)}`
  }
}
