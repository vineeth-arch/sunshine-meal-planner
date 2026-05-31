import { doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'

import type {
  MealSlotDocument,
  UpdateMealSlotInput,
  WeeklyPlanDocument,
} from '../../types/domain'
import {
  buildMealSlotId,
  mapMealSlotDocument,
  mapWeeklyPlanDocument,
  mealSlotsCollection,
  normalizeWeekStartKey,
  readRequiredDoc,
  requireHouseholdAccess,
  sortMealSlots,
  withServiceError,
  type FirestoreServiceContext,
} from './firestoreDataService'

export interface WeeklyPlanWithSlots {
  plan: WeeklyPlanDocument | null
  mealSlots: MealSlotDocument[]
}

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

export async function updateMealSlot(
  context: FirestoreServiceContext,
  weekStart: string,
  input: UpdateMealSlotInput,
): Promise<MealSlotDocument> {
  return withServiceError('Could not update meal slot', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const planId = normalizeWeekStartKey(weekStart)
    const planRef = doc(access.collections.weeklyPlans, planId)
    const planSnapshot = await getDoc(planRef)

    if (!planSnapshot.exists()) {
      await setDoc(planRef, {
        weekStart: planId,
        createdBy: access.user.uid,
        updatedBy: access.user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } else {
      await setDoc(
        planRef,
        {
          updatedBy: access.user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    }

    const slotId = buildMealSlotId({
      day: input.day,
      mealType: input.mealType,
      slotType: input.slotType,
      position: input.position,
    })
    const slotRef = doc(mealSlotsCollection(planRef), slotId)

    await setDoc(
      slotRef,
      {
        day: input.day,
        mealType: input.mealType,
        slotType: input.slotType.trim(),
        dishId: input.dishId.trim(),
        position: input.position,
        notes: input.notes?.trim() ?? '',
        updatedBy: access.user.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    return readRequiredDoc(slotRef, mapMealSlotDocument, 'The updated meal slot could not be loaded.')
  })
}
