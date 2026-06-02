import type { User } from '@supabase/supabase-js'

import { canEdit } from '../../features/auth/access'
import { requireSupabase } from '../../lib/supabase'
import type {
  AdminRoleLabels,
  DayKey,
  DishCategory,
  HouseholdSettingsDocument,
  MealName,
  MealSlotDocument,
  UserProfile,
  WeeklyPlanDocument,
} from '../../types/domain'

export interface CloudServiceContext {
  user: User | null
  profile: UserProfile | null
}

export interface HouseholdAccess {
  user: User
  profile: UserProfile
  householdId: string
}

export type JsonRecord = Record<string, unknown>

export type HouseholdRow = {
  id: string
  name: string | null
  created_by: string | null
  created_at: string
}

export type DataRow = {
  household_id: string
  id: string
  data: JsonRecord | null
  updated_at: string
  updated_by: string | null
}

export type WeeklyPlanRow = {
  household_id: string
  week_start: string
  data: JsonRecord | null
  updated_at: string
  updated_by: string | null
}

export type MealSlotRow = {
  household_id: string
  week_start: string
  id: string
  data: JsonRecord | null
  updated_at: string
  updated_by: string | null
}

export type SettingsRow = {
  household_id: string
  data: JsonRecord | null
  updated_at: string
  updated_by: string | null
}

export function requireHouseholdAccess(
  context: CloudServiceContext,
  options: { requireEdit?: boolean } = {},
): HouseholdAccess {
  if (!context.user) {
    throw new Error('A signed-in user is required.')
  }

  if (!context.profile) {
    throw new Error('A Supabase profile is required.')
  }

  const householdId = context.profile.householdId.trim()
  if (!householdId) {
    throw new Error('A household ID is required.')
  }

  if (options.requireEdit) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Connect to edit.')
    }

    if (!canEdit(context.profile)) {
      throw new Error('Connect to edit. This profile is read-only.')
    }
  }

  return {
    user: context.user,
    profile: context.profile,
    householdId,
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

export async function withServiceError<T>(action: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (caught) {
    if (caught instanceof Error) {
      throw new Error(`${action}: ${caught.message}`, { cause: caught })
    }

    throw new Error(`${action}.`, { cause: caught })
  }
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

export function asOptionalString(value: unknown, fieldName?: string): string {
  void fieldName
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  return String(value)
}

export function asTimestamp(value: unknown, fieldName: string): string {
  if (typeof value === 'string' && value.trim()) return value
  throw new Error(`${fieldName} must be an ISO timestamp.`)
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

export function asOptionalRoleLabels(value: unknown): Partial<AdminRoleLabels> | undefined {
  if (value === undefined || value === null) return undefined
  const record = asRecord(value, 'roleLabels')
  const result: Partial<AdminRoleLabels> = {}

  if (typeof record.admin === 'string') result.admin = record.admin
  if (typeof record.editor === 'string') result.editor = record.editor
  if (typeof record.member === 'string') result.member = record.member

  return result
}

export function asSchemaVersion(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value
  throw new Error('schemaVersion must be a non-negative integer.')
}

export async function selectRows<T extends { household_id: string }>(
  table: string,
  householdId: string,
): Promise<T[]> {
  const { data, error } = await requireSupabase()
    .from(table)
    .select('*')
    .eq('household_id', householdId)

  if (error) throw error
  return (data ?? []) as T[]
}

export async function selectRow<T>(
  table: string,
  filters: Record<string, string>,
): Promise<T | null> {
  let query = requireSupabase().from(table).select('*')
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value)
  })

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data as T | null
}

export async function upsertRow<T>(
  table: string,
  row: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await requireSupabase()
    .from(table)
    .upsert(row)
    .select('*')
    .single()

  if (error) throw error
  return data as T
}

export async function deleteRows(table: string, filters: Record<string, string>): Promise<void> {
  let query = requireSupabase().from(table).delete()
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value)
  })

  const { error } = await query
  if (error) throw error
}

export function mapWeeklyPlanDocument(row: WeeklyPlanRow): WeeklyPlanDocument {
  return {
    id: row.week_start,
    weekStart: row.week_start,
    createdBy: asOptionalString(row.data?.createdBy, 'createdBy') || row.updated_by || '',
    updatedBy: row.updated_by || asOptionalString(row.data?.updatedBy, 'updatedBy'),
    createdAt: asTimestamp(row.data?.createdAt ?? row.updated_at, 'createdAt'),
    updatedAt: asTimestamp(row.updated_at, 'updatedAt'),
  }
}

export function mapMealSlotDocument(row: MealSlotRow): MealSlotDocument {
  const data = asRecord(row.data ?? {}, 'Meal slot data')

  return {
    id: row.id,
    day: asDayKey(data.day),
    mealType: asMealName(data.mealType),
    slotType: asString(data.slotType, 'slotType'),
    dishId: asString(data.dishId, 'dishId'),
    position: asNumber(data.position, 'position'),
    notes: asOptionalString(data.notes, 'notes'),
    updatedBy: row.updated_by || asOptionalString(data.updatedBy, 'updatedBy'),
    updatedAt: asTimestamp(row.updated_at, 'updatedAt'),
  }
}

export function mapHouseholdSettingsDocument(row: SettingsRow | null): HouseholdSettingsDocument | null {
  if (!row) return null
  const data = asRecord(row.data ?? {}, 'Household settings')

  return {
    id: 'app',
    schemaVersion: asSchemaVersion(data.schemaVersion ?? 1),
    regionPreferences: asStringArray(data.regionPreferences ?? [], 'regionPreferences'),
    enabledMealTypes: asStringArray(data.enabledMealTypes ?? ['breakfast', 'lunch', 'dinner'], 'enabledMealTypes') as MealName[],
    updatedAt: asTimestamp(row.updated_at, 'updatedAt'),
    roleLabels: asOptionalRoleLabels(data.roleLabels),
  }
}
