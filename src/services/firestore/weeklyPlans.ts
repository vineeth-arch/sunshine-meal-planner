import { deleteDoc, doc, getDoc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'

import { createEmptyWeekDays } from '../../lib/date/plans'
import type {
  MealSlotDocument,
  WeeklyPlan,
  WeeklyPlanDocument,
} from '../../types/domain'
import {
  buildMealSlotId,
  mapMealSlotDocument,
  mapWeeklyPlanDocument,
  mealSlotsCollection,
  normalizeWeekStartKey,
  requireHouseholdAccess,
  sortMealSlots,
  withServiceError,
  type FirestoreServiceContext,
} from './firestoreDataService'

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
  context: FirestoreServiceContext,
  weekStart: string,
): Promise<WeeklyPlanWithSlots> {
  return withServiceError('Could not load weekly plan', async () => {
    const access = requireHouseholdAccess(context)
    const planId = normalizeWeekStartKey(weekStart)
    const planRef = doc(access.collections.weeklyPlans, planId)
    const planSnapshot = await getDoc(planRef)
    const mealSlotsSnapshot = await getDocs(mealSlotsCollection(planRef))

    return {
      plan: planSnapshot.exists() ? mapWeeklyPlanDocument(planSnapshot.id, planSnapshot.data()) : null,
      mealSlots: sortMealSlots(
        mealSlotsSnapshot.docs.map((entry) => mapMealSlotDocument(entry.id, entry.data())),
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
  context: FirestoreServiceContext,
  plan: WeeklyPlan,
): Promise<WeeklyPlanWithSlots> {
  return withServiceError('Could not save weekly plan', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const weekStart = normalizeWeekStartKey(plan.weekStartingDate)
    const planRef = doc(access.collections.weeklyPlans, weekStart)
    const existingSlots = await getDocs(mealSlotsCollection(planRef))
    const nextSlots = collectPlanSlots(plan)
    const batch = writeBatch(planRef.firestore)

    batch.set(
      planRef,
      {
        weekStart,
        createdBy: access.user.uid,
        updatedBy: access.user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    const nextIds = new Set<string>()
    nextSlots.forEach((slot) => {
      const slotId = buildMealSlotId(slot)
      nextIds.add(slotId)
      batch.set(
        doc(mealSlotsCollection(planRef), slotId),
        {
          day: slot.day,
          mealType: slot.mealType,
          slotType: slot.slotType,
          dishId: slot.dishId,
          position: slot.position,
          notes: '',
          updatedBy: access.user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    })

    existingSlots.docs.forEach((entry) => {
      if (!nextIds.has(entry.id)) {
        batch.delete(entry.ref)
      }
    })

    await batch.commit()
    return getWeeklyPlan(context, weekStart)
  })
}

export async function deleteWeeklyPlan(context: FirestoreServiceContext, weekStart: string): Promise<void> {
  return withServiceError('Could not clear weekly plan', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const planId = normalizeWeekStartKey(weekStart)
    const planRef = doc(access.collections.weeklyPlans, planId)
    const existingSlots = await getDocs(mealSlotsCollection(planRef))
    const batch = writeBatch(planRef.firestore)

    existingSlots.docs.forEach((entry) => batch.delete(entry.ref))
    batch.delete(planRef)

    await batch.commit()
  })
}

export async function deleteMealSlotDocument(
  context: FirestoreServiceContext,
  weekStart: string,
  slotId: string,
): Promise<void> {
  return withServiceError('Could not delete meal slot', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const planRef = doc(access.collections.weeklyPlans, normalizeWeekStartKey(weekStart))
    await deleteDoc(doc(mealSlotsCollection(planRef), slotId))
  })
}
