import { requireSupabase } from '../../lib/supabase'
import type {
  AdminBackupDish,
  AdminBackupHousehold,
  AdminBackupIngredient,
  AdminBackupMealSlot,
  AdminBackupPantryItem,
  AdminBackupPayload,
  AdminBackupSettings,
  AdminBackupStaple,
  AdminBackupUserProfile,
  AdminBackupWeeklyPlan,
  AdminDataCounts,
  AdminImportPreview,
  AdminImportResult,
  AdminRecentChange,
  HouseholdSettingsDocument,
  UserRole,
} from '../../types/domain'
import { isAdmin, isSuperadmin } from '../../features/auth/access'
import { getHousehold, mapUserProfile } from './supabaseProfileService'
import {
  mapHouseholdSettingsDocument,
  mapMealSlotDocument,
  mapWeeklyPlanDocument,
  requireHouseholdAccess,
  selectRows,
  upsertRow,
  withServiceError,
  type DataRow,
  type CloudServiceContext,
  type MealSlotRow,
  type SettingsRow,
  type WeeklyPlanRow,
} from './supabaseDataService'
import { mapDishDocument } from './dishes'
import { mapIngredientDocument } from './ingredients'
import { mapPantryItemDocument } from './pantry'
import { mapStapleDocument } from './staples'

type OperationCounts = { add: number; update: number }

export interface AdminDashboardData {
  household: AdminBackupHousehold
  profiles: AdminBackupUserProfile[]
  settings: HouseholdSettingsDocument | null
  counts: AdminDataCounts
  recentChanges: AdminRecentChange[]
}

type ProfileRow = {
  id: string
  role: UserRole
  household_id: string | null
  is_superadmin: boolean | null
  display_name: string | null
  email: string | null
  created_at: string
}

function assertAdminContext(context: CloudServiceContext) {
  if (!isAdmin(context.profile) && !isSuperadmin(context.profile)) {
    throw new Error('Admin access is required.')
  }
  return requireHouseholdAccess(context)
}

function serializeHousehold(value: Awaited<ReturnType<typeof getHousehold>>): AdminBackupHousehold {
  if (!value) throw new Error('The linked household could not be found.')
  return {
    id: value.id,
    name: value.name,
    ownerUid: value.ownerUid,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function serializeProfile(row: ProfileRow): AdminBackupUserProfile {
  const profile = mapUserProfile(row)
  return {
    uid: profile.uid,
    role: profile.role,
    householdId: profile.householdId,
    isSuperadmin: profile.isSuperadmin,
    displayName: profile.displayName,
    email: profile.email,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    lastLoginAt: profile.lastLoginAt,
  }
}

function serializeSettings(value: HouseholdSettingsDocument | null): AdminBackupSettings | null {
  if (!value) return null
  return {
    schemaVersion: value.schemaVersion,
    regionPreferences: [...value.regionPreferences],
    enabledMealTypes: [...value.enabledMealTypes],
    roleLabels: value.roleLabels ? { ...value.roleLabels } : undefined,
  }
}

function buildRecentChanges(input: {
  dishes: ReturnType<typeof mapDishDocument>[]
  ingredients: ReturnType<typeof mapIngredientDocument>[]
  staples: ReturnType<typeof mapStapleDocument>[]
  pantryItems: ReturnType<typeof mapPantryItemDocument>[]
  weeklyPlans: ReturnType<typeof mapWeeklyPlanDocument>[]
  mealSlots: Array<ReturnType<typeof mapMealSlotDocument> & { planId: string }>
}): AdminRecentChange[] {
  const changes: AdminRecentChange[] = []

  input.dishes.forEach((entry) => changes.push({
    id: entry.id,
    collection: 'dishes',
    label: entry.name,
    updatedBy: entry.updatedBy,
    updatedAt: entry.updatedAt,
  }))
  input.ingredients.forEach((entry) => changes.push({
    id: entry.id,
    collection: 'ingredients',
    label: entry.name,
    updatedBy: entry.updatedBy,
    updatedAt: entry.updatedAt,
  }))
  input.staples.forEach((entry) => changes.push({
    id: entry.id,
    collection: 'staples',
    label: entry.name,
    updatedBy: entry.updatedBy,
    updatedAt: entry.updatedAt,
  }))
  input.pantryItems.forEach((entry) => changes.push({
    id: entry.id,
    collection: 'pantryItems',
    label: entry.name,
    updatedBy: entry.updatedBy,
    updatedAt: entry.updatedAt,
  }))
  input.weeklyPlans.forEach((entry) => changes.push({
    id: entry.id,
    collection: 'weeklyPlans',
    label: entry.weekStart,
    updatedBy: entry.updatedBy,
    updatedAt: entry.updatedAt,
  }))
  input.mealSlots.forEach((entry) => changes.push({
    id: entry.id,
    collection: 'mealSlots',
    label: `${entry.planId} • ${entry.day} ${entry.mealType} • ${entry.slotType}`,
    updatedBy: entry.updatedBy,
    updatedAt: entry.updatedAt,
  }))

  return changes.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
}

async function loadHouseholdData(context: CloudServiceContext) {
  const access = assertAdminContext(context)
  const supabase = requireSupabase()

  const [
    household,
    profilesResult,
    dishes,
    ingredients,
    staples,
    pantryItems,
    weeklyPlans,
    mealSlots,
    settingsRows,
  ] = await Promise.all([
    getHousehold(access.householdId),
    supabase
      .from('profiles')
      .select('id, role, household_id, is_superadmin, display_name, email, created_at')
      .eq('household_id', access.householdId),
    selectRows<DataRow>('dishes', access.householdId),
    selectRows<DataRow>('ingredients', access.householdId),
    selectRows<DataRow>('staples', access.householdId),
    selectRows<DataRow>('pantry_items', access.householdId),
    selectRows<WeeklyPlanRow>('weekly_plans', access.householdId),
    selectRows<MealSlotRow>('meal_slots', access.householdId),
    selectRows<SettingsRow>('household_settings', access.householdId),
  ])

  if (profilesResult.error) throw profilesResult.error

  return {
    access,
    household,
    profiles: (profilesResult.data ?? []) as ProfileRow[],
    dishes: dishes.map(mapDishDocument),
    ingredients: ingredients.map(mapIngredientDocument),
    staples: staples.map(mapStapleDocument),
    pantryItems: pantryItems.map(mapPantryItemDocument),
    weeklyPlans: weeklyPlans.map(mapWeeklyPlanDocument),
    mealSlots: mealSlots.map((row) => ({ ...mapMealSlotDocument(row), planId: row.week_start })),
    settings: mapHouseholdSettingsDocument(settingsRows[0] ?? null),
  }
}

export async function getAdminDashboardData(context: CloudServiceContext): Promise<AdminDashboardData> {
  return withServiceError('Could not load admin dashboard', async () => {
    const data = await loadHouseholdData(context)

    return {
      household: serializeHousehold(data.household),
      profiles: data.profiles.map(serializeProfile).sort((left, right) => left.displayName.localeCompare(right.displayName)),
      settings: data.settings,
      counts: {
        dishes: data.dishes.length,
        ingredients: data.ingredients.length,
        pantryItems: data.pantryItems.length,
        weeklyPlans: data.weeklyPlans.length,
      },
      recentChanges: buildRecentChanges(data).slice(0, 20),
    }
  })
}

export async function exportHouseholdBackup(context: CloudServiceContext): Promise<AdminBackupPayload> {
  return withServiceError('Could not export household backup', async () => {
    const data = await loadHouseholdData(context)

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: data.access.user.id,
      householdId: data.access.householdId,
      household: serializeHousehold(data.household),
      profiles: data.profiles.map(serializeProfile).sort((left, right) => left.displayName.localeCompare(right.displayName)),
      settings: serializeSettings(data.settings),
      dishes: data.dishes,
      ingredients: data.ingredients,
      staples: data.staples,
      pantryItems: data.pantryItems,
      weeklyPlans: data.weeklyPlans,
      mealSlots: data.mealSlots,
    }
  })
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>
  throw new Error(`${label} is invalid.`)
}

function asString(value: unknown, fieldName: string): string {
  if (typeof value === 'string' && value.trim()) return value
  throw new Error(`${fieldName} is required.`)
}

function asAnyString(value: unknown, fieldName: string): string {
  if (typeof value === 'string') return value
  throw new Error(`${fieldName} must be a string.`)
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${fieldName} must be an array.`)
  return value.map((entry, index) => {
    if (typeof entry !== 'string') throw new Error(`${fieldName}[${index}] must be a string.`)
    return entry
  })
}

function asNumber(value: unknown, fieldName: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new Error(`${fieldName} must be a number.`)
}

function asVersion(value: unknown): 1 {
  if (value === 1) return 1
  throw new Error('Unsupported backup version. Expected version 1.')
}

function parseAdminBackupPayload(text: string): AdminBackupPayload {
  const parsed = JSON.parse(text) as Record<string, unknown>
  const household = asObject(parsed.household, 'household')
  const settings = parsed.settings == null ? null : asObject(parsed.settings, 'settings')

  return {
    version: asVersion(parsed.version),
    exportedAt: asString(parsed.exportedAt, 'exportedAt'),
    exportedBy: asString(parsed.exportedBy, 'exportedBy'),
    householdId: asString(parsed.householdId, 'householdId'),
    household: {
      id: asString(household.id, 'household.id'),
      name: asString(household.name, 'household.name'),
      ownerUid: asAnyString(household.ownerUid ?? '', 'household.ownerUid'),
      createdAt: asString(household.createdAt, 'household.createdAt'),
      updatedAt: asString(household.updatedAt, 'household.updatedAt'),
    },
    profiles: Array.isArray(parsed.profiles)
      ? parsed.profiles.map((entry, index) => {
          const record = asObject(entry, `profiles[${index}]`)
          return {
            uid: asString(record.uid, `profiles[${index}].uid`),
            role: asString(record.role, `profiles[${index}].role`) as AdminBackupUserProfile['role'],
            householdId: asString(record.householdId, `profiles[${index}].householdId`),
            isSuperadmin: asBoolean(record.isSuperadmin),
            displayName: asString(record.displayName, `profiles[${index}].displayName`),
            email: asAnyString(record.email ?? '', `profiles[${index}].email`),
            createdAt: asString(record.createdAt, `profiles[${index}].createdAt`),
            updatedAt: asString(record.updatedAt, `profiles[${index}].updatedAt`),
            lastLoginAt: asOptionalString(record.lastLoginAt) ?? null,
          }
        })
      : [],
    settings: settings
      ? {
          schemaVersion: asNumber(settings.schemaVersion, 'settings.schemaVersion'),
          regionPreferences: asStringArray(settings.regionPreferences, 'settings.regionPreferences'),
          enabledMealTypes: asStringArray(settings.enabledMealTypes, 'settings.enabledMealTypes') as AdminBackupSettings['enabledMealTypes'],
          roleLabels: settings.roleLabels as AdminBackupSettings['roleLabels'],
        }
      : null,
    dishes: (Array.isArray(parsed.dishes) ? parsed.dishes : []) as AdminBackupDish[],
    ingredients: (Array.isArray(parsed.ingredients) ? parsed.ingredients : []) as AdminBackupIngredient[],
    staples: (Array.isArray(parsed.staples) ? parsed.staples : []) as AdminBackupStaple[],
    pantryItems: (Array.isArray(parsed.pantryItems) ? parsed.pantryItems : []) as AdminBackupPantryItem[],
    weeklyPlans: (Array.isArray(parsed.weeklyPlans) ? parsed.weeklyPlans : []) as AdminBackupWeeklyPlan[],
    mealSlots: (Array.isArray(parsed.mealSlots) ? parsed.mealSlots : []) as AdminBackupMealSlot[],
  }
}

function countOperations<T extends { id: string }>(incoming: T[], existingIds: Set<string>): OperationCounts {
  return incoming.reduce(
    (totals, entry) => {
      if (existingIds.has(entry.id)) totals.update += 1
      else totals.add += 1
      return totals
    },
    { add: 0, update: 0 },
  )
}

export async function previewHouseholdImport(
  context: CloudServiceContext,
  text: string,
): Promise<AdminImportPreview> {
  return withServiceError('Could not preview backup import', async () => {
    const data = await loadHouseholdData(context)
    const payload = parseAdminBackupPayload(text)

    if (payload.householdId !== data.access.householdId || payload.household.id !== data.access.householdId) {
      throw new Error('This backup belongs to a different household and cannot be imported here.')
    }

    if (payload.profiles.some((entry) => entry.householdId !== data.access.householdId)) {
      throw new Error('Backup profiles must stay inside the current household.')
    }

    const profileIds = new Set(data.profiles.map((entry) => entry.id))
    const dishIds = new Set(data.dishes.map((entry) => entry.id))
    const ingredientIds = new Set(data.ingredients.map((entry) => entry.id))
    const stapleIds = new Set(data.staples.map((entry) => entry.id))
    const pantryIds = new Set(data.pantryItems.map((entry) => entry.id))
    const weeklyPlanIds = new Set(data.weeklyPlans.map((entry) => entry.id))
    const mealSlotIds = new Set(data.mealSlots.map((entry) => entry.id))

    return {
      payload,
      counts: {
        profiles: payload.profiles.length,
        dishes: payload.dishes.length,
        ingredients: payload.ingredients.length,
        staples: payload.staples.length,
        pantryItems: payload.pantryItems.length,
        weeklyPlans: payload.weeklyPlans.length,
        mealSlots: payload.mealSlots.length,
      },
      operations: {
        profiles: countOperations(payload.profiles.map((entry) => ({ id: entry.uid })), profileIds),
        dishes: countOperations(payload.dishes, dishIds),
        ingredients: countOperations(payload.ingredients, ingredientIds),
        staples: countOperations(payload.staples, stapleIds),
        pantryItems: countOperations(payload.pantryItems, pantryIds),
        weeklyPlans: countOperations(payload.weeklyPlans, weeklyPlanIds),
        mealSlots: countOperations(payload.mealSlots, mealSlotIds),
      },
    }
  })
}

export async function importHouseholdBackup(
  context: CloudServiceContext,
  preview: AdminImportPreview,
): Promise<AdminImportResult> {
  return withServiceError('Could not import backup', async () => {
    const access = assertAdminContext(context)
    const payload = preview.payload

    if (payload.householdId !== access.householdId) {
      throw new Error('This backup belongs to a different household and cannot be imported here.')
    }

    await upsertRow('households', {
      id: access.householdId,
      name: payload.household.name,
      created_by: payload.household.ownerUid || access.user.id,
    })

    await Promise.all([
      ...payload.profiles.map((entry) => upsertRow('profiles', {
        id: entry.uid,
        display_name: entry.displayName,
        email: entry.email,
        role: entry.role,
        household_id: entry.householdId,
        is_superadmin: false,
      })),
      ...(payload.settings ? [upsertRow('household_settings', {
        household_id: access.householdId,
        data: payload.settings,
        updated_by: access.user.id,
      })] : []),
      ...payload.dishes.map((entry) => upsertRow('dishes', {
        household_id: access.householdId,
        id: entry.id,
        data: entry,
        updated_by: access.user.id,
      })),
      ...payload.ingredients.map((entry) => upsertRow('ingredients', {
        household_id: access.householdId,
        id: entry.id,
        data: entry,
        updated_by: access.user.id,
      })),
      ...payload.staples.map((entry) => upsertRow('staples', {
        household_id: access.householdId,
        id: entry.id,
        data: entry,
        updated_by: access.user.id,
      })),
      ...payload.pantryItems.map((entry) => upsertRow('pantry_items', {
        household_id: access.householdId,
        id: entry.id,
        data: entry,
        updated_by: access.user.id,
      })),
      ...payload.weeklyPlans.map((entry) => upsertRow('weekly_plans', {
        household_id: access.householdId,
        week_start: entry.weekStart,
        data: entry,
        updated_by: access.user.id,
      })),
      ...payload.mealSlots.map((entry) => upsertRow('meal_slots', {
        household_id: access.householdId,
        week_start: entry.planId,
        id: entry.id,
        data: entry,
        updated_by: access.user.id,
      })),
    ])

    return preview.operations
  })
}

export async function saveAdminRoleLabels(
  context: CloudServiceContext,
  roleLabels: HouseholdSettingsDocument['roleLabels'],
): Promise<HouseholdSettingsDocument> {
  return withServiceError('Could not save role labels', async () => {
    const access = assertAdminContext(context)
    const data = await loadHouseholdData(context)
    const row = await upsertRow<SettingsRow>('household_settings', {
      household_id: access.householdId,
      data: {
        schemaVersion: data.settings?.schemaVersion ?? 1,
        regionPreferences: data.settings?.regionPreferences ?? [],
        enabledMealTypes: data.settings?.enabledMealTypes ?? ['breakfast', 'lunch', 'dinner'],
        roleLabels,
      },
      updated_by: access.user.id,
    })

    const saved = mapHouseholdSettingsDocument(row)
    if (!saved) throw new Error('The updated role labels could not be loaded.')
    return saved
  })
}
