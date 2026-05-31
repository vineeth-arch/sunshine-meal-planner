import type { DayKey, DayPlan, WeeklyPlanDays } from '../../types/domain'

export const DAYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

export const DAY_FULL: Record<DayKey, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

export function getWeekStartDate(now = new Date()): string {
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(new Date(now).setDate(diff)).toISOString().split('T')[0]
}

export function getTodayKey(now = new Date()): DayKey {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    now.getDay()
  ] as DayKey
}

export function getTomorrowKey(now = new Date()): DayKey {
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  return getTodayKey(next)
}

export function emptyDayPlan(): DayPlan {
  return {
    breakfast: { sabjis: [] },
    lunch: { curry: '', sabji: '', gujaratiSabji: '' },
    dinner: { curry: '', sabjis: [], gujaratiSabji: '' },
  }
}

export function createEmptyWeekDays(): WeeklyPlanDays {
  return DAYS.reduce<WeeklyPlanDays>((acc, day) => {
    acc[day] = emptyDayPlan()
    return acc
  }, {} as WeeklyPlanDays)
}

export function isEmptyDayPlan(plan?: DayPlan | null): boolean {
  if (!plan) return true
  const breakfastFilled = plan.breakfast.sabjis.length > 0
  const lunchFilled = Boolean(plan.lunch.curry || plan.lunch.sabji || plan.lunch.gujaratiSabji)
  const dinnerFilled = Boolean(
    plan.dinner.curry || plan.dinner.sabjis.length > 0 || plan.dinner.gujaratiSabji,
  )

  return !breakfastFilled && !lunchFilled && !dinnerFilled
}
