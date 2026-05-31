import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore'

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
} from '../../types/domain'
import { mapDishDocument } from './dishes'
import {
  asOptionalRoleLabels,
  getDb,
  type FirestoreServiceContext,
  mapHouseholdSettingsDocument,
  mapMealSlotDocument,
  mapWeeklyPlanDocument,
  mealSlotsCollection,
  requireHouseholdAccess,
  withServiceError,
} from './firestoreDataService'
import { mapIngredientDocument } from './ingredients'
import { mapPantryItemDocument } from './pantry'
import { mapHousehold, mapUserProfile } from './firestoreProfileService'
import { mapStapleDocument } from './staples'

type OperationCounts = { add: number; update: number }

export interface AdminDashboardData {
  household: AdminBackupHousehold
  profiles: AdminBackupUserProfile[]
  settings: HouseholdSettingsDocument | null
  counts: AdminDataCounts
  recentChanges: AdminRecentChange[]
}

function toIsoString(value: Timestamp): string {
  return value.toDate().toISOString()
}

function fromIsoString(value: string, fieldName: string): Timestamp {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO timestamp.`)
  }

  return Timestamp.fromDate(parsed)
}

function serializeHousehold(value: ReturnType<typeof mapHousehold>): AdminBackupHousehold {
  return {
    id: value.id,
    name: value.name,
    ownerUid: value.ownerUid,
    createdAt: toIsoString(value.createdAt),
    updatedAt: toIsoString(value.updatedAt),
  }
}

function serializeProfile(value: ReturnType<typeof mapUserProfile>): AdminBackupUserProfile {
  return {
    uid: value.uid,
    role: value.role,
    householdId: value.householdId,
    profileKey: value.profileKey,
    displayName: value.displayName,
    createdAt: toIsoString(value.createdAt),
    updatedAt: toIsoString(value.updatedAt),
    lastLoginAt: value.lastLoginAt ? toIsoString(value.lastLoginAt) : null,
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

function serializeDish(value: ReturnType<typeof mapDishDocument>): AdminBackupDish {
  return {
    ...value,
    createdAt: toIsoString(value.createdAt),
    updatedAt: toIsoString(value.updatedAt),
  }
}

function serializeIngredient(value: ReturnType<typeof mapIngredientDocument>): AdminBackupIngredient {
  return {
    ...value,
    createdAt: toIsoString(value.createdAt),
    updatedAt: toIsoString(value.updatedAt),
  }
}

function serializeStaple(value: ReturnType<typeof mapStapleDocument>): AdminBackupStaple {
  return {
    ...value,
    createdAt: toIsoString(value.createdAt),
    updatedAt: toIsoString(value.updatedAt),
  }
}

function serializePantryItem(value: ReturnType<typeof mapPantryItemDocument>): AdminBackupPantryItem {
  return {
    ...value,
    updatedAt: toIsoString(value.updatedAt),
  }
}

function serializeWeeklyPlan(value: ReturnType<typeof mapWeeklyPlanDocument>): AdminBackupWeeklyPlan {
  return {
    ...value,
    createdAt: toIsoString(value.createdAt),
    updatedAt: toIsoString(value.updatedAt),
  }
}

function serializeMealSlot(planId: string, value: ReturnType<typeof mapMealSlotDocument>): AdminBackupMealSlot {
  return {
    ...value,
    planId,
    updatedAt: toIsoString(value.updatedAt),
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

  input.dishes.forEach((entry) => {
    changes.push({
      id: entry.id,
      collection: 'dishes',
      label: entry.name,
      updatedBy: entry.updatedBy,
      updatedAt: entry.updatedAt,
    })
  })

  input.ingredients.forEach((entry) => {
    changes.push({
      id: entry.id,
      collection: 'ingredients',
      label: entry.name,
      updatedBy: entry.updatedBy,
      updatedAt: entry.updatedAt,
    })
  })

  input.staples.forEach((entry) => {
    changes.push({
      id: entry.id,
      collection: 'staples',
      label: entry.name,
      updatedBy: entry.updatedBy,
      updatedAt: entry.updatedAt,
    })
  })

  input.pantryItems.forEach((entry) => {
    changes.push({
      id: entry.id,
      collection: 'pantryItems',
      label: entry.name,
      updatedBy: entry.updatedBy,
      updatedAt: entry.updatedAt,
    })
  })

  input.weeklyPlans.forEach((entry) => {
    changes.push({
      id: entry.id,
      collection: 'weeklyPlans',
      label: entry.weekStart,
      updatedBy: entry.updatedBy,
      updatedAt: entry.updatedAt,
    })
  })

  input.mealSlots.forEach((entry) => {
    changes.push({
      id: entry.id,
      collection: 'mealSlots',
      label: `${entry.planId} • ${entry.day} ${entry.mealType} • ${entry.slotType}`,
      updatedBy: entry.updatedBy,
      updatedAt: entry.updatedAt,
    })
  })

  return changes.sort((left, right) => right.updatedAt.toMillis() - left.updatedAt.toMillis())
}

async function loadHouseholdData(context: FirestoreServiceContext) {
  const access = requireHouseholdAccess(context)
  const db = getDb()
  const profilesQuery = query(collection(db, 'users'), where('householdId', '==', access.householdId))

  const [
    householdSnapshot,
    profilesSnapshot,
    dishesSnapshot,
    ingredientsSnapshot,
    staplesSnapshot,
    pantrySnapshot,
    weeklyPlansSnapshot,
    settingsSnapshot,
  ] = await Promise.all([
    getDoc(access.householdRef),
    getDocs(profilesQuery),
    getDocs(access.collections.dishes),
    getDocs(access.collections.ingredients),
    getDocs(access.collections.staples),
    getDocs(access.collections.pantryItems),
    getDocs(access.collections.weeklyPlans),
    getDoc(doc(access.collections.settings, 'app')),
  ])

  if (!householdSnapshot.exists()) {
    throw new Error('The linked household document could not be found.')
  }

  const weeklyPlans = weeklyPlansSnapshot.docs.map((entry) => mapWeeklyPlanDocument(entry.id, entry.data()))
  const mealSlotEntries = await Promise.all(
    weeklyPlansSnapshot.docs.map(async (entry) => {
      const mealSlotsSnapshot = await getDocs(mealSlotsCollection(entry.ref))
      return mealSlotsSnapshot.docs.map((slot) => ({
        ...mapMealSlotDocument(slot.id, slot.data()),
        planId: entry.id,
      }))
    }),
  )

  const dishes = dishesSnapshot.docs.map((entry) => mapDishDocument(entry.id, entry.data()))
  const ingredients = ingredientsSnapshot.docs.map((entry) => mapIngredientDocument(entry.id, entry.data()))
  const staples = staplesSnapshot.docs.map((entry) => mapStapleDocument(entry.id, entry.data()))
  const pantryItems = pantrySnapshot.docs.map((entry) => mapPantryItemDocument(entry.id, entry.data()))
  const profiles = profilesSnapshot.docs.map((entry) => mapUserProfile(entry.id, entry.data()))
  const settings = settingsSnapshot.exists()
    ? mapHouseholdSettingsDocument(settingsSnapshot.id, settingsSnapshot.data())
    : null

  return {
    access,
    household: mapHousehold(householdSnapshot.id, householdSnapshot.data()),
    profiles,
    dishes,
    ingredients,
    staples,
    pantryItems,
    weeklyPlans,
    mealSlots: mealSlotEntries.flat(),
    settings,
  }
}

export async function getAdminDashboardData(context: FirestoreServiceContext): Promise<AdminDashboardData> {
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

export async function exportHouseholdBackup(context: FirestoreServiceContext): Promise<AdminBackupPayload> {
  return withServiceError('Could not export household backup', async () => {
    const data = await loadHouseholdData(context)

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: data.access.user.uid,
      householdId: data.access.householdId,
      household: serializeHousehold(data.household),
      profiles: data.profiles.map(serializeProfile).sort((left, right) => left.displayName.localeCompare(right.displayName)),
      settings: serializeSettings(data.settings),
      dishes: data.dishes.map(serializeDish),
      ingredients: data.ingredients.map(serializeIngredient),
      staples: data.staples.map(serializeStaple),
      pantryItems: data.pantryItems.map(serializePantryItem),
      weeklyPlans: data.weeklyPlans.map(serializeWeeklyPlan),
      mealSlots: data.mealSlots.map((entry) => serializeMealSlot(entry.planId, entry)),
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
      ownerUid: asString(household.ownerUid, 'household.ownerUid'),
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
            profileKey: asString(record.profileKey, `profiles[${index}].profileKey`) as AdminBackupUserProfile['profileKey'],
            displayName: asString(record.displayName, `profiles[${index}].displayName`),
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
          roleLabels: asOptionalRoleLabels(settings.roleLabels),
        }
      : null,
    dishes: Array.isArray(parsed.dishes)
      ? parsed.dishes.map((entry, index) => {
          const record = asObject(entry, `dishes[${index}]`)
          return {
            id: asString(record.id, `dishes[${index}].id`),
            name: asString(record.name, `dishes[${index}].name`),
            category: asString(record.category, `dishes[${index}].category`) as AdminBackupDish['category'],
            mainIngredients: asStringArray(record.mainIngredients ?? [], `dishes[${index}].mainIngredients`),
            emoji: asString(record.emoji, `dishes[${index}].emoji`),
            recipe: asAnyString(record.recipe ?? '', `dishes[${index}].recipe`).trim(),
            youtubeUrl: asAnyString(record.youtubeUrl ?? '', `dishes[${index}].youtubeUrl`).trim(),
            referenceText: asAnyString(record.referenceText ?? '', `dishes[${index}].referenceText`).trim(),
            imageUrl: asAnyString(record.imageUrl ?? '', `dishes[${index}].imageUrl`).trim(),
            createdBy: asString(record.createdBy, `dishes[${index}].createdBy`),
            updatedBy: asString(record.updatedBy, `dishes[${index}].updatedBy`),
            createdAt: asString(record.createdAt, `dishes[${index}].createdAt`),
            updatedAt: asString(record.updatedAt, `dishes[${index}].updatedAt`),
          }
        })
      : [],
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map((entry, index) => {
          const record = asObject(entry, `ingredients[${index}]`)
          return {
            id: asString(record.id, `ingredients[${index}].id`),
            name: asString(record.name, `ingredients[${index}].name`),
            emoji: asString(record.emoji, `ingredients[${index}].emoji`),
            malayalamName: asAnyString(record.malayalamName ?? '', `ingredients[${index}].malayalamName`).trim(),
            gujaratiName: asAnyString(record.gujaratiName ?? '', `ingredients[${index}].gujaratiName`).trim(),
            imageUrl: asAnyString(record.imageUrl ?? '', `ingredients[${index}].imageUrl`).trim(),
            createdBy: asString(record.createdBy, `ingredients[${index}].createdBy`),
            updatedBy: asString(record.updatedBy, `ingredients[${index}].updatedBy`),
            createdAt: asString(record.createdAt, `ingredients[${index}].createdAt`),
            updatedAt: asString(record.updatedAt, `ingredients[${index}].updatedAt`),
          }
        })
      : [],
    staples: Array.isArray(parsed.staples)
      ? parsed.staples.map((entry, index) => {
          const record = asObject(entry, `staples[${index}]`)
          return {
            id: asString(record.id, `staples[${index}].id`),
            name: asString(record.name, `staples[${index}].name`),
            createdBy: asString(record.createdBy, `staples[${index}].createdBy`),
            updatedBy: asString(record.updatedBy, `staples[${index}].updatedBy`),
            createdAt: asString(record.createdAt, `staples[${index}].createdAt`),
            updatedAt: asString(record.updatedAt, `staples[${index}].updatedAt`),
          }
        })
      : [],
    pantryItems: Array.isArray(parsed.pantryItems)
      ? parsed.pantryItems.map((entry, index) => {
          const record = asObject(entry, `pantryItems[${index}]`)
          return {
            id: asString(record.id, `pantryItems[${index}].id`),
            ingredientId: asString(record.ingredientId, `pantryItems[${index}].ingredientId`),
            kind: asString(record.kind, `pantryItems[${index}].kind`) as AdminBackupPantryItem['kind'],
            name: asString(record.name, `pantryItems[${index}].name`),
            quantity: asAnyString(record.quantity ?? '', `pantryItems[${index}].quantity`).trim(),
            unit: asAnyString(record.unit ?? '', `pantryItems[${index}].unit`).trim(),
            status: asString(record.status, `pantryItems[${index}].status`),
            updatedBy: asString(record.updatedBy, `pantryItems[${index}].updatedBy`),
            updatedAt: asString(record.updatedAt, `pantryItems[${index}].updatedAt`),
          }
        })
      : [],
    weeklyPlans: Array.isArray(parsed.weeklyPlans)
      ? parsed.weeklyPlans.map((entry, index) => {
          const record = asObject(entry, `weeklyPlans[${index}]`)
          return {
            id: asString(record.id, `weeklyPlans[${index}].id`),
            weekStart: asString(record.weekStart, `weeklyPlans[${index}].weekStart`),
            createdBy: asString(record.createdBy, `weeklyPlans[${index}].createdBy`),
            updatedBy: asString(record.updatedBy, `weeklyPlans[${index}].updatedBy`),
            createdAt: asString(record.createdAt, `weeklyPlans[${index}].createdAt`),
            updatedAt: asString(record.updatedAt, `weeklyPlans[${index}].updatedAt`),
          }
        })
      : [],
    mealSlots: Array.isArray(parsed.mealSlots)
      ? parsed.mealSlots.map((entry, index) => {
          const record = asObject(entry, `mealSlots[${index}]`)
          return {
            id: asString(record.id, `mealSlots[${index}].id`),
            planId: asString(record.planId, `mealSlots[${index}].planId`),
            day: asString(record.day, `mealSlots[${index}].day`) as AdminBackupMealSlot['day'],
            mealType: asString(record.mealType, `mealSlots[${index}].mealType`) as AdminBackupMealSlot['mealType'],
            slotType: asString(record.slotType, `mealSlots[${index}].slotType`),
            dishId: asString(record.dishId, `mealSlots[${index}].dishId`),
            position: asNumber(record.position, `mealSlots[${index}].position`),
            notes: asAnyString(record.notes ?? '', `mealSlots[${index}].notes`).trim(),
            updatedBy: asString(record.updatedBy, `mealSlots[${index}].updatedBy`),
            updatedAt: asString(record.updatedAt, `mealSlots[${index}].updatedAt`),
          }
        })
      : [],
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
  context: FirestoreServiceContext,
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

    const profileIds = new Set(data.profiles.map((entry) => entry.uid))
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
  context: FirestoreServiceContext,
  preview: AdminImportPreview,
): Promise<AdminImportResult> {
  return withServiceError('Could not import backup', async () => {
    const access = requireHouseholdAccess(context)
    const payload = preview.payload

    if (payload.householdId !== access.householdId) {
      throw new Error('This backup belongs to a different household and cannot be imported here.')
    }

    const batch = writeBatch(getDb())

    batch.set(doc(getDb(), 'households', access.householdId), {
      name: payload.household.name,
      ownerUid: payload.household.ownerUid,
      createdAt: fromIsoString(payload.household.createdAt, 'household.createdAt'),
      updatedAt: serverTimestamp(),
    }, { merge: true })

    payload.profiles.forEach((entry) => {
      batch.set(doc(getDb(), 'users', entry.uid), {
        displayName: entry.displayName,
        role: entry.role,
        householdId: entry.householdId,
        profileKey: entry.profileKey,
        createdAt: fromIsoString(entry.createdAt, `profiles.${entry.uid}.createdAt`),
        updatedAt: serverTimestamp(),
        ...(entry.lastLoginAt ? { lastLoginAt: fromIsoString(entry.lastLoginAt, `profiles.${entry.uid}.lastLoginAt`) } : {}),
      }, { merge: true })
    })

    if (payload.settings) {
      batch.set(doc(access.collections.settings, 'app'), {
        schemaVersion: payload.settings.schemaVersion,
        regionPreferences: payload.settings.regionPreferences,
        enabledMealTypes: payload.settings.enabledMealTypes,
        ...(payload.settings.roleLabels ? { roleLabels: payload.settings.roleLabels } : {}),
        updatedAt: serverTimestamp(),
      }, { merge: true })
    }

    payload.dishes.forEach((entry) => {
      batch.set(doc(access.collections.dishes, entry.id), {
        name: entry.name,
        category: entry.category,
        mainIngredients: entry.mainIngredients,
        emoji: entry.emoji,
        recipe: entry.recipe,
        youtubeUrl: entry.youtubeUrl,
        referenceText: entry.referenceText,
        imageUrl: entry.imageUrl,
        createdBy: entry.createdBy,
        updatedBy: access.user.uid,
        createdAt: fromIsoString(entry.createdAt, `dishes.${entry.id}.createdAt`),
        updatedAt: serverTimestamp(),
      }, { merge: true })
    })

    payload.ingredients.forEach((entry) => {
      batch.set(doc(access.collections.ingredients, entry.id), {
        name: entry.name,
        emoji: entry.emoji,
        malayalamName: entry.malayalamName,
        gujaratiName: entry.gujaratiName,
        imageUrl: entry.imageUrl,
        createdBy: entry.createdBy,
        updatedBy: access.user.uid,
        createdAt: fromIsoString(entry.createdAt, `ingredients.${entry.id}.createdAt`),
        updatedAt: serverTimestamp(),
      }, { merge: true })
    })

    payload.staples.forEach((entry) => {
      batch.set(doc(access.collections.staples, entry.id), {
        name: entry.name,
        createdBy: entry.createdBy,
        updatedBy: access.user.uid,
        createdAt: fromIsoString(entry.createdAt, `staples.${entry.id}.createdAt`),
        updatedAt: serverTimestamp(),
      }, { merge: true })
    })

    payload.pantryItems.forEach((entry) => {
      batch.set(doc(access.collections.pantryItems, entry.id), {
        ingredientId: entry.ingredientId,
        kind: entry.kind,
        name: entry.name,
        quantity: entry.quantity,
        unit: entry.unit,
        status: entry.status,
        updatedBy: access.user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    })

    payload.weeklyPlans.forEach((entry) => {
      batch.set(doc(access.collections.weeklyPlans, entry.id), {
        weekStart: entry.weekStart,
        createdBy: entry.createdBy,
        updatedBy: access.user.uid,
        createdAt: fromIsoString(entry.createdAt, `weeklyPlans.${entry.id}.createdAt`),
        updatedAt: serverTimestamp(),
      }, { merge: true })
    })

    payload.mealSlots.forEach((entry) => {
      const planRef = doc(access.collections.weeklyPlans, entry.planId)
      batch.set(doc(mealSlotsCollection(planRef), entry.id), {
        day: entry.day,
        mealType: entry.mealType,
        slotType: entry.slotType,
        dishId: entry.dishId,
        position: entry.position,
        notes: entry.notes,
        updatedBy: access.user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    })

    await batch.commit()
    return preview.operations
  })
}

export async function saveAdminRoleLabels(
  context: FirestoreServiceContext,
  roleLabels: HouseholdSettingsDocument['roleLabels'],
): Promise<HouseholdSettingsDocument> {
  return withServiceError('Could not save role labels', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const settingsRef = doc(access.collections.settings, 'app')
    const existing = await getDoc(settingsRef)

    const payload = existing.exists()
      ? { ...existing.data(), roleLabels, updatedAt: serverTimestamp() }
      : {
          schemaVersion: 1,
          regionPreferences: [],
          enabledMealTypes: ['breakfast', 'lunch', 'dinner'],
          roleLabels,
          updatedAt: serverTimestamp(),
        }

    await setDoc(settingsRef, payload, { merge: true })
    const saved = await getDoc(settingsRef)
    if (!saved.exists()) {
      throw new Error('The updated role labels could not be loaded.')
    }

    return mapHouseholdSettingsDocument(saved.id, saved.data())
  })
}
