import { describe, expect, it } from 'vitest'

import {
  DAYS,
  createEmptyWeekDays,
  emptyDayPlan,
  getTodayKey,
  getTomorrowKey,
  getWeekStartDate,
  isEmptyDayPlan,
} from './plans'

describe('plan date helpers', () => {
  it('calculates the monday week start for weekdays and sunday', () => {
    expect(getWeekStartDate(new Date('2026-05-27T12:00:00.000Z'))).toBe('2026-05-25')
    expect(getWeekStartDate(new Date('2026-05-31T12:00:00.000Z'))).toBe('2026-05-25')
  })

  it('returns today and tomorrow keys across week rollover', () => {
    expect(getTodayKey(new Date('2026-05-31T12:00:00.000Z'))).toBe('sunday')
    expect(getTomorrowKey(new Date('2026-05-31T12:00:00.000Z'))).toBe('monday')
  })

  it('builds an empty week with an empty plan for every day', () => {
    const week = createEmptyWeekDays()

    expect(Object.keys(week)).toEqual(DAYS)
    expect(week.monday).toEqual(emptyDayPlan())
    expect(week.sunday.dinner.sabjis).toEqual([])
  })

  it('detects empty and filled day plans correctly', () => {
    const plan = emptyDayPlan()
    expect(isEmptyDayPlan(undefined)).toBe(true)
    expect(isEmptyDayPlan(null)).toBe(true)
    expect(isEmptyDayPlan(plan)).toBe(true)

    plan.breakfast.sabjis.push('dish-1')
    expect(isEmptyDayPlan(plan)).toBe(false)

    const dinnerPlan = emptyDayPlan()
    dinnerPlan.dinner.gujaratiSabji = 'dish-2'
    expect(isEmptyDayPlan(dinnerPlan)).toBe(false)
  })
})
