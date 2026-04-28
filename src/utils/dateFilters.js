import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, format, parseISO } from 'date-fns'

/**
 * Date filter helpers for expense filtering and analytics
 */

export function getTodayRange() {
  const today = new Date()
  return { start: today, end: today, label: 'Today' }
}

export function getThisWeekRange() {
  const now = new Date()
  return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), label: 'This Week' }
}

export function getThisMonthRange() {
  const now = new Date()
  return { start: startOfMonth(now), end: endOfMonth(now), label: 'This Month' }
}

export function getLastMonthRange() {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth), label: 'Last Month' }
}

export function getLast7DaysRange() {
  const now = new Date()
  return { start: subDays(now, 6), end: now, label: 'Last 7 Days' }
}

export function getLast30DaysRange() {
  const now = new Date()
  return { start: subDays(now, 29), end: now, label: 'Last 30 Days' }
}

export function getDateRangePreset(preset) {
  switch (preset) {
    case 'today': return getTodayRange()
    case 'this_week': return getThisWeekRange()
    case 'this_month': return getThisMonthRange()
    case 'last_month': return getLastMonthRange()
    case 'last_7_days': return getLast7DaysRange()
    case 'last_30_days': return getLast30DaysRange()
    default: return getThisMonthRange()
  }
}

/**
 * Check if a date string falls within a range
 */
export function isDateInRange(dateStr, startDate, endDate) {
  if (!dateStr) return false
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
  const start = startDate instanceof Date ? startDate : parseISO(startDate)
  const end = endDate instanceof Date ? endDate : parseISO(endDate)

  // Set all to start of day for comparison
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  return d >= s && d <= e
}

/**
 * Format date for display
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '-'
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
  return format(date, 'dd MMM yyyy')
}

/**
 * Format date for input[type="date"]
 */
export function formatInputDate(date) {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Get month name and year
 */
export function getMonthYearLabel(date) {
  return format(date, 'MMMM yyyy')
}

/**
 * Get all months for a year selector
 */
export function getMonthOptions() {
  return [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ]
}

/**
 * Get year options (current year +/- 2)
 */
export function getYearOptions() {
  const currentYear = new Date().getFullYear()
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => ({
    value: y,
    label: String(y)
  }))
}
