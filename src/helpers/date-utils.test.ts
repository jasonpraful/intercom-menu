import { describe, expect, test } from 'bun:test'
import {
  getWeekMonday,
  getWeekRange,
  formatDate,
  parseDate,
  mapDaysToDate,
  getDayName,
  isDateInWeek,
  getNextWeekRange,
  getMenuWeekRange,
} from './date-utils'

describe('formatDate', () => {
  test('formats date as YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 0, 11))).toBe('2026-01-11')
    expect(formatDate(new Date(2026, 11, 25))).toBe('2026-12-25')
  })

  test('pads single digit months and days', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(formatDate(new Date(2026, 8, 9))).toBe('2026-09-09')
  })
})

describe('parseDate', () => {
  test('parses YYYY-MM-DD format', () => {
    const date = parseDate('2026-01-11')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(11)
  })

  test('roundtrips with formatDate', () => {
    expect(formatDate(parseDate('2026-06-15'))).toBe('2026-06-15')
  })
})

describe('getWeekMonday', () => {
  test('returns same date for Monday', () => {
    expect(formatDate(getWeekMonday(new Date(2026, 0, 12)))).toBe('2026-01-12')
  })

  test('returns previous Monday for weekdays', () => {
    expect(formatDate(getWeekMonday(new Date(2026, 0, 13)))).toBe('2026-01-12') // Tuesday
    expect(formatDate(getWeekMonday(new Date(2026, 0, 16)))).toBe('2026-01-12') // Friday
  })

  test('returns previous Monday for Saturday', () => {
    expect(formatDate(getWeekMonday(new Date(2026, 0, 10)))).toBe('2026-01-05') // Saturday
  })

  test('returns next Monday for Sunday', () => {
    expect(formatDate(getWeekMonday(new Date(2026, 0, 11)))).toBe('2026-01-12') // Sunday
  })
})

describe('getWeekRange', () => {
  test('returns Monday-Friday range', () => {
    const range = getWeekRange(new Date(2026, 0, 14)) // Wednesday
    expect(range.startDate).toBe('2026-01-12')
    expect(range.endDate).toBe('2026-01-16')
    expect(range.weekKey).toBe('london-2026-01-12-2026-01-16')
  })

  test('accepts string input', () => {
    const range = getWeekRange('2026-01-14')
    expect(range.startDate).toBe('2026-01-12')
  })
})

describe('mapDaysToDate', () => {
  test('maps day names to dates', () => {
    const map = mapDaysToDate('2026-01-12')
    expect(map.Monday).toBe('2026-01-12')
    expect(map.Tuesday).toBe('2026-01-13')
    expect(map.Friday).toBe('2026-01-16')
  })
})

describe('getDayName', () => {
  test('returns correct day names', () => {
    expect(getDayName(new Date(2026, 0, 11))).toBe('Sunday')
    expect(getDayName(new Date(2026, 0, 12))).toBe('Monday')
    expect(getDayName('2026-01-12')).toBe('Monday')
  })
})

describe('isDateInWeek', () => {
  const week = { startDate: '2026-01-12', endDate: '2026-01-16', weekKey: 'london-2026-01-12-2026-01-16' }

  test('returns true for dates within week', () => {
    expect(isDateInWeek('2026-01-12', week)).toBe(true)
    expect(isDateInWeek('2026-01-14', week)).toBe(true)
    expect(isDateInWeek('2026-01-16', week)).toBe(true)
  })

  test('returns false for dates outside week', () => {
    expect(isDateInWeek('2026-01-11', week)).toBe(false)
    expect(isDateInWeek('2026-01-17', week)).toBe(false)
  })
})

describe('getNextWeekRange', () => {
  test('returns valid week range', () => {
    const range = getNextWeekRange()
    expect(range.weekKey).toMatch(/^london-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}$/)
  })

  test('Friday is 4 days after Monday', () => {
    const range = getNextWeekRange()
    const diffDays = (parseDate(range.endDate).getTime() - parseDate(range.startDate).getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBe(4)
  })
})

describe('getMenuWeekRange', () => {
  test('returns valid week range structure', () => {
    const range = getMenuWeekRange()
    expect(range.weekKey).toMatch(/^london-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}$/)
    expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('week span is always Monday to Friday (4 days)', () => {
    const range = getMenuWeekRange()
    const startDay = parseDate(range.startDate).getDay()
    const endDay = parseDate(range.endDate).getDay()
    const diffDays = (parseDate(range.endDate).getTime() - parseDate(range.startDate).getTime()) / (24 * 60 * 60 * 1000)

    expect(startDay).toBe(1) // Monday
    expect(endDay).toBe(5) // Friday
    expect(diffDays).toBe(4)
  })
})

describe('weekend week key calculation', () => {
  // Saturday is still end of current week, so getMenuWeekRange handles it specially
  test('Sunday directly produces upcoming week key', () => {
    const sunday = new Date(2026, 0, 11) // Sunday Jan 11
    expect(sunday.getDay()).toBe(0)

    const weekRange = getWeekRange(sunday)
    expect(weekRange.weekKey).toBe('london-2026-01-12-2026-01-16')
  })

  test('Saturday produces current week key', () => {
    const saturday = new Date(2026, 0, 10)
    expect(saturday.getDay()).toBe(6)

    const currentWeek = getWeekRange(saturday)
    expect(currentWeek.weekKey).toBe('london-2026-01-05-2026-01-09')

    const nextMonday = new Date(saturday)
    nextMonday.setDate(nextMonday.getDate() + 2)
    const upcomingWeek = getWeekRange(nextMonday)
    expect(upcomingWeek.weekKey).toBe('london-2026-01-12-2026-01-16')
  })
})
