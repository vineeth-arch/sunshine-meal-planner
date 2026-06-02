import { createEmptyWeekDays } from '../../lib/date/plans'
import { requireSupabase } from '../../lib/supabase'
import type {
  MealSlotDocument,
  WeeklyPlan,
  WeeklyPlanDocument,
} from '../../types/domain'
import {
  buildMealSlotId,
  deleteRows,
  mapMealSlotDocument,
  mapWeeklyPlanDocument,
  normalizeWeekStartKey,
  requireHouseholdAccess,
  selectRow,
  selectRows,
  sortMealSlots,
  upsertRow,
  withServiceError,
  type CloudServiceContext,
  type MealSlotRow,
  type WeeklyPlanRow,
} from './supabaseDataService'

export interface WeeklyPlanWithSlots {
  plan: WeeklyPlanDocument | null
  mealSlots: MealSlotDocument[]
}

type SlotSeed = {
  day: MealSlotDocument['day']
  mealType: MealSlotDocument['mealType']
  slotType: string
  dishId: string
  position: number
}

const SLOT_ORDER = [
  { mealType: 'breakfast', slotType: 'sabjis', getter: (plan: WeeklyPlan, day: keyof WeeklyPlan['days']) => plan.days[day].breakfast.sabjis },
  { mealType: 'lunch', slotType: 'curry', getter: (plan: WeeklyPlan, day: keyof WeeklyPlan['days']) => [plan.days[day].lunch.curry] },
  { mealType: 'lunch', slotType: 'sabji', getter: (plan: WeeklyPlan, day: keyof WeeklyPlan['days']) => [plan.days[day].lunch.sabji] },
  { mealType: 'lunch', slotType: 'gujaratiSabji', getter: (plan: WeeklyPlan, day: keyof WeeklyPlan['days']) => [plan.days[day].lunch.gujaratiSabji] },
  { mealType: 'dinner', slotType: 'curry', getter: (plan: WeeklyPlan, day: keyof WeeklyPlan['days']) => [plan.days[day].dinner.curry] },
  { mealType: 'dinner', slotType: 'sabjis', getter: (plan: WeeklyPlan, day: keyof WeeklyPlan['days']) => plan.days[day].dinner.sabjis },
  { mealType: 'dinner', slotType: 'gujaratiSabji', getter: (plan: WeeklyPlan, day: keyof WeeklyPlan['days']) => [plan.days[day].dinner.gujaratiSabji] },
] as const

export async function getWeeklyPlan(
  context: CloudServiceContext,
  weekStart: string,
): Promise<WeeklyPlanWithSlots> {
  return withServiceError('Could not load weekly plan', async () => {
    const access = requireHouseholdAccess(context)
    const planId = normalizeWeekStartKey(weekStart)
    const [planRow, slotRows] = await Promise.all([
      selectRow<WeeklyPlanRow>('weekly_plans', {
        household_id: access.householdId,
        week_start: planId,
      }),
      selectRows<MealSlotRow>('meal_slots', access.householdId),
    ])

    return {
      plan: planRow ? mapWeeklyPlanDocument(planRow) : null,
      mealSlots: sortMealSlots(
        slotRows
          .filter((row) => row.week_start === planId)
          .map(mapMealSlotDocument),
      ),
    }
  })
}

export function buildWeeklyPlanFromSlots(
  weekStart: string,
  mealSlots: MealSlotDocument[],
): WeeklyPlan {
  const days = createEmptyWeekDays()

  mealSlots.forEach((slot) => {
    if (!slot.dishId) return
    if (slot.mealType === 'breakfast' && slot.slotType === 'sabjis') {
      days[slot.day].breakfast.sabjis[slot.position] = slot.dishId
      return
    }

    if (slot.mealType === 'lunch' && slot.slotType === 'curry') {
      days[slot.day].lunch.curry = slot.dishId
      return
    }

    if (slot.mealType === 'lunch' && slot.slotType === 'sabji') {
      days[slot.day].lunch.sabji = slot.dishId
      return
    }

    if (slot.mealType === 'lunch' && slot.slotType === 'gujaratiSabji') {
      days[slot.day].lunch.gujaratiSabji = slot.dishId
      return
    }

    if (slot.mealType === 'dinner' && slot.slotType === 'curry') {
      days[slot.day].dinner.curry = slot.dishId
      return
    }

    if (slot.mealType === 'dinner' && slot.slotType === 'sabjis') {
      days[slot.day].dinner.sabjis[slot.position] = slot.dishId
      return
    }

    if (slot.mealType === 'dinner' && slot.slotType === 'gujaratiSabji') {
      days[slot.day].dinner.gujaratiSabji = slot.dishId
    }
  })

  return { weekStartingDate: normalizeWeekStartKey(weekStart), days }
}

function collectPlanSlots(plan: WeeklyPlan): SlotSeed[] {
  const result: SlotSeed[] = []

  ;(Object.keys(plan.days) as Array<keyof WeeklyPlan['days']>).forEach((day) => {
    SLOT_ORDER.forEach((entry) => {
      const dishIds = entry.getter(plan, day).filter(Boolean)
      dishIds.forEach((dishId, index) => {
        result.push({
          day,
          mealType: entry.mealType,
          slotType: entry.slotType,
          dishId,
          position: index,
        })
      })
    })
  })

  return result
}

export async function saveWeeklyPlan(
  context: CloudServiceContext,
  plan: WeeklyPlan,
): Promise<WeeklyPlanWithSlots> {
  return withServiceError('Could not save weekly plan', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const weekStart = normalizeWeekStartKey(plan.weekStartingDate)
    const now = new Date().toISOString()

    await upsertRow<WeeklyPlanRow>('weekly_plans', {
      household_id: access.householdId,
      week_start: weekStart,
      data: {
        createdBy: access.user.id,
        createdAt: now,
      },
      updated_by: access.user.id,
    })

    const slots = collectPlanSlots(plan)
    const slotRows = slots.map((slot) => ({
      household_id: access.householdId,
      week_start: weekStart,
      id: buildMealSlotId(slot),
      data: {
        day: slot.day,
        mealType: slot.mealType,
        slotType: slot.slotType,
        dishId: slot.dishId,
        position: slot.position,
        notes: '',
        updatedBy: access.user.id,
      },
      updated_by: access.user.id,
    }))

    if (slotRows.length) {
      const { error: upsertError } = await requireSupabase()
        .from('meal_slots')
        .upsert(slotRows)

      if (upsertError) throw upsertError
    }

    const staleDelete = requireSupabase()
      .from('meal_slots')
      .delete()
      .eq('household_id', access.householdId)
      .eq('week_start', weekStart)

    const { error: deleteError } = slotRows.length
      ? await staleDelete.not('id', 'in', `(${slotRows.map((slot) => `"${slot.id.replace(/"/g, '\\"')}"`).join(',')})`)
      : await staleDelete

    if (deleteError) throw deleteError

    return getWeeklyPlan(context, weekStart)
  })
}

export async function deleteWeeklyPlan(context: CloudServiceContext, weekStart: string): Promise<void> {
  return withServiceError('Could not clear weekly plan', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const planId = normalizeWeekStartKey(weekStart)
    await deleteRows('meal_slots', {
      household_id: access.householdId,
      week_start: planId,
    })
    await deleteRows('weekly_plans', {
      household_id: access.householdId,
      week_start: planId,
    })
  })
}

export async function deleteMealSlotDocument(
  context: CloudServiceContext,
  weekStart: string,
  slotId: string,
): Promise<void> {
  return withServiceError('Could not delete meal slot', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    await deleteRows('meal_slots', {
      household_id: access.householdId,
      week_start: normalizeWeekStartKey(weekStart),
      id: slotId,
    })
  })
}
