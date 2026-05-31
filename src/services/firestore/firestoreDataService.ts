import type { User } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Timestamp,
} from 'firebase/firestore'

import { getFirebaseApp } from '../../lib/firebase'
import { canEdit } from '../../features/auth/access'
import type {
  DayKey,
  DishCategory,
  HouseholdSettingsDocument,
  MealName,
  MealSlotDocument,
  UserProfile,
  WeeklyPlanDocument,
} from '../../types/domain'

export interface FirestoreServiceContext {
  user: User | null
  profile: UserProfile | null
}

type HouseholdCollections = {
  dishes: CollectionReference<DocumentData>
  ingredients: CollectionReference<DocumentData>
  pantryItems: CollectionReference<DocumentData>
  weeklyPlans: CollectionReference<DocumentData>
  settings: CollectionReference<DocumentData>
}

export interface HouseholdAccess {
  user: User
  profile: UserProfile
  householdId: string
  householdRef: DocumentReference<DocumentData>
  collections: HouseholdCollections
}

export function getDb() {
  const app = getFirebaseApp()
  if (!app) {
    throw new Error('Firebase is not configured.')
  }

  return getFirestore(app)
}

export function requireHouseholdAccess(
  context: FirestoreServiceContext,
  options: { requireEdit?: boolean } = {},
): HouseholdAccess {
  if (!context.user) {
    throw new Error('A signed-in user is required.')
  }

  if (!context.profile) {
    throw new Error('A Firestore user profile is required.')
  }

  const householdId = context.profile.householdId.trim()
  if (!householdId) {
    throw new Error('A household ID is required.')
  }

  if (options.requireEdit && !canEdit(context.profile)) {
    throw new Error('This profile does not have permission to edit household data.')
  }

  const db = getDb()
  const householdRef = doc(db, 'households', householdId)

  return {
    user: context.user,
    profile: context.profile,
    householdId,
    householdRef,
    collections: {
      dishes: collection(householdRef, 'dishes'),
      ingredients: collection(householdRef, 'ingredients'),
      pantryItems: collection(householdRef, 'pantryItems'),
      weeklyPlans: collection(householdRef, 'weeklyPlans'),
      settings: collection(householdRef, 'settings'),
    },
  }
}

export function normalizeWeekStartKey(weekStart: string): string {
  const normalized = weekStart.trim()
  if (!normalized) {
    throw new Error('weekStart is required.')
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('weekStart must be a valid date string.')
  }

  return parsed.toISOString().slice(0, 10)
}

export function buildMealSlotId(input: Pick<MealSlotDocument, 'day' | 'mealType' | 'slotType' | 'position'>): string {
  return [input.day, input.mealType, input.slotType.trim(), String(input.position)].join('--')
}

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
  )
}

export function sortMealSlots(slots: MealSlotDocument[]): MealSlotDocument[] {
  const dayOrder: DayKey[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]
  const mealOrder: MealName[] = ['breakfast', 'lunch', 'dinner']

  return [...slots].sort((left, right) => {
    const dayDelta = dayOrder.indexOf(left.day) - dayOrder.indexOf(right.day)
    if (dayDelta !== 0) return dayDelta

    const mealDelta = mealOrder.indexOf(left.mealType) - mealOrder.indexOf(right.mealType)
    if (mealDelta !== 0) return mealDelta

    const slotTypeDelta = left.slotType.localeCompare(right.slotType, undefined, { sensitivity: 'base' })
    if (slotTypeDelta !== 0) return slotTypeDelta

    return left.position - right.position
  })
}

export function withServiceError<T>(action: string, operation: () => Promise<T>): Promise<T> {
  return operation().catch((caught: unknown) => {
    if (caught instanceof Error) {
      throw new Error(`${action}: ${caught.message}`)
    }

    throw new Error(`${action}: Unknown error.`)
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (isRecord(value)) return value
  throw new Error(`${label} is invalid.`)
}

export function asString(value: unknown, fieldName: string): string {
  if (typeof value === 'string' && value.trim()) return value
  throw new Error(`${fieldName} is required.`)
}

export function asOptionalString(value: unknown, fieldName: string): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  throw new Error(`${fieldName} must be a string.`)
}

export function asTimestamp(value: unknown, fieldName: string): Timestamp {
  const timestampName = value && typeof value === 'object' && 'constructor' in value
    ? (value.constructor as { name?: string }).name
    : undefined

  if (timestampName === 'Timestamp') {
    return value as Timestamp
  }

  throw new Error(`${fieldName} must be a Firestore timestamp.`)
}

export function asDishCategory(value: unknown): DishCategory {
  if (value === 'sabji' || value === 'curry' || value === 'gujarati') return value
  throw new Error('category must be sabji, curry, or gujarati.')
}

export function asDayKey(value: unknown): DayKey {
  if (
    value === 'monday'
    || value === 'tuesday'
    || value === 'wednesday'
    || value === 'thursday'
    || value === 'friday'
    || value === 'saturday'
    || value === 'sunday'
  ) {
    return value
  }

  throw new Error('day must be a valid weekday key.')
}

export function asMealName(value: unknown): MealName {
  if (value === 'breakfast' || value === 'lunch' || value === 'dinner') return value
  throw new Error('mealType must be breakfast, lunch, or dinner.')
}

export function asNumber(value: unknown, fieldName: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new Error(`${fieldName} must be a number.`)
}

export function asStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of strings.`)
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'string') {
      throw new Error(`${fieldName}[${index}] must be a string.`)
    }

    return entry
  })
}

export function asSchemaVersion(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value
  throw new Error('schemaVersion must be a non-negative integer.')
}

export function mealSlotsCollection(planRef: DocumentReference<DocumentData>) {
  return collection(planRef, 'mealSlots')
}

export async function readRequiredDoc<T>(
  ref: DocumentReference<DocumentData>,
  mapper: (id: string, data: unknown) => T,
  notFoundMessage: string,
): Promise<T> {
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) {
    throw new Error(notFoundMessage)
  }

  return mapper(snapshot.id, snapshot.data())
}

export function mapWeeklyPlanDocument(id: string, data: unknown): WeeklyPlanDocument {
  const record = asRecord(data, 'Weekly plan data')

  return {
    id,
    weekStart: asString(record.weekStart, 'weekStart'),
    createdBy: asString(record.createdBy, 'createdBy'),
    updatedBy: asString(record.updatedBy, 'updatedBy'),
    createdAt: asTimestamp(record.createdAt, 'createdAt'),
    updatedAt: asTimestamp(record.updatedAt, 'updatedAt'),
  }
}

export function mapMealSlotDocument(id: string, data: unknown): MealSlotDocument {
  const record = asRecord(data, 'Meal slot data')

  return {
    id,
    day: asDayKey(record.day),
    mealType: asMealName(record.mealType),
    slotType: asString(record.slotType, 'slotType'),
    dishId: asString(record.dishId, 'dishId'),
    position: asNumber(record.position, 'position'),
    notes: asOptionalString(record.notes, 'notes'),
    updatedBy: asString(record.updatedBy, 'updatedBy'),
    updatedAt: asTimestamp(record.updatedAt, 'updatedAt'),
  }
}

export function mapHouseholdSettingsDocument(id: string, data: unknown): HouseholdSettingsDocument {
  const record = asRecord(data, 'Household settings data')

  return {
    id: id as 'app',
    schemaVersion: asSchemaVersion(record.schemaVersion),
    regionPreferences: asStringArray(record.regionPreferences, 'regionPreferences'),
    enabledMealTypes: asStringArray(record.enabledMealTypes, 'enabledMealTypes').map((value) => asMealName(value)),
    updatedAt: asTimestamp(record.updatedAt, 'updatedAt'),
  }
}
