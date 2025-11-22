/**
 * Date utilities for menu storage and retrieval
 */

export interface WeekRange {
  startDate: string // YYYY-MM-DD (Monday)
  endDate: string   // YYYY-MM-DD (Friday)
  weekKey: string   // london-YYYY-MM-DD-YYYY-MM-DD
}

export interface DayToDateMap extends Record<string, string> {
  Monday: string
  Tuesday: string
  Wednesday: string
  Thursday: string
  Friday: string
}

/**
 * Get the Monday of the week containing the given date
 */
export function getWeekMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(d.setDate(diff))
}

/**
 * Get the week range (Monday-Friday) for a given date
 */
export function getWeekRange(date: Date | string): WeekRange {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  const monday = getWeekMonday(inputDate)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  const startDate = formatDate(monday)
  const endDate = formatDate(friday)

  return {
    startDate,
    endDate,
    weekKey: `london-${startDate}-${endDate}`
  }
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse date from YYYY-MM-DD format
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Map day names to actual dates for a given week
 */
export function mapDaysToDate(weekMondayDate: Date | string): DayToDateMap {
  const monday = typeof weekMondayDate === 'string' ? parseDate(weekMondayDate) : weekMondayDate

  return {
    Monday: formatDate(monday),
    Tuesday: formatDate(new Date(monday.getTime() + 24 * 60 * 60 * 1000)),
    Wednesday: formatDate(new Date(monday.getTime() + 2 * 24 * 60 * 60 * 1000)),
    Thursday: formatDate(new Date(monday.getTime() + 3 * 24 * 60 * 60 * 1000)),
    Friday: formatDate(new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000))
  }
}

/**
 * Get day name from date
 */
export function getDayName(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return dayNames[d.getDay()]
}

/**
 * Check if a date is within a week range
 */
export function isDateInWeek(date: string, weekRange: WeekRange): boolean {
  return date >= weekRange.startDate && date <= weekRange.endDate
}

/**
 * Get the current week's range
 */
export function getCurrentWeekRange(): WeekRange {
  return getWeekRange(new Date())
}

/**
 * Get next week's range
 */
export function getNextWeekRange(): WeekRange {
  const nextMonday = new Date()
  const currentDay = nextMonday.getDay()
  const daysUntilNextMonday = currentDay === 0 ? 1 : 8 - currentDay
  nextMonday.setDate(nextMonday.getDate() + daysUntilNextMonday)
  return getWeekRange(nextMonday)
}