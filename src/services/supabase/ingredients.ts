import type {
  CreateIngredientInput,
  IngredientDocument,
  UpdateIngredientInput,
} from '../../types/domain'
import {
  asOptionalString,
  asRecord,
  asString,
  asTimestamp,
  deleteRows,
  requireHouseholdAccess,
  selectRow,
  selectRows,
  sortByName,
  upsertRow,
  withServiceError,
  type DataRow,
  type CloudServiceContext,
} from './supabaseDataService'

const TABLE = 'ingredients'

export function mapIngredientDocument(row: DataRow): IngredientDocument {
  const record = asRecord(row.data ?? {}, 'Ingredient data')

  return {
    id: row.id,
    name: asString(record.name, 'name'),
    emoji: asString(record.emoji, 'emoji'),
    malayalamName: asOptionalString(record.malayalamName, 'malayalamName'),
    gujaratiName: asOptionalString(record.gujaratiName, 'gujaratiName'),
    imageUrl: asOptionalString(record.imageUrl, 'imageUrl'),
    createdBy: asOptionalString(record.createdBy, 'createdBy') || row.updated_by || '',
    updatedBy: row.updated_by || asOptionalString(record.updatedBy, 'updatedBy'),
    createdAt: asTimestamp(record.createdAt ?? row.updated_at, 'createdAt'),
    updatedAt: asTimestamp(row.updated_at, 'updatedAt'),
  }
}

function normalizeIngredientId(name: string, fallback?: string) {
  const source = fallback?.trim() || name.trim().toLowerCase()
  return source.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function getIngredientId(name: string, fallback?: string) {
  return normalizeIngredientId(name, fallback)
}

function buildIngredientData(input: CreateIngredientInput | UpdateIngredientInput, userId: string, existing?: IngredientDocument): Record<string, unknown> {
  const now = new Date().toISOString()
  return {
    ...(existing ? {
      createdBy: existing.createdBy,
      createdAt: existing.createdAt,
    } : {
      createdBy: userId,
      createdAt: now,
    }),
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.emoji !== undefined ? { emoji: input.emoji.trim() || '🥬' } : {}),
    ...(input.malayalamName !== undefined ? { malayalamName: input.malayalamName.trim() } : {}),
    ...(input.gujaratiName !== undefined ? { gujaratiName: input.gujaratiName.trim() } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl.trim() } : {}),
    updatedBy: userId,
  }
}

export async function getIngredients(context: CloudServiceContext): Promise<IngredientDocument[]> {
  return withServiceError('Could not load ingredients', async () => {
    const access = requireHouseholdAccess(context)
    const rows = await selectRows<DataRow>(TABLE, access.householdId)
    return sortByName(rows.map(mapIngredientDocument))
  })
}

export async function createIngredient(
  context: CloudServiceContext,
  input: CreateIngredientInput,
): Promise<IngredientDocument> {
  return withServiceError('Could not create ingredient', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const row = await upsertRow<DataRow>(TABLE, {
      household_id: access.householdId,
      id: normalizeIngredientId(input.name, input.id),
      data: buildIngredientData(input, access.user.id),
      updated_by: access.user.id,
    })

    return mapIngredientDocument(row)
  })
}

export async function updateIngredient(
  context: CloudServiceContext,
  ingredientId: string,
  input: UpdateIngredientInput,
): Promise<IngredientDocument> {
  return withServiceError('Could not update ingredient', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const existingRow = await selectRow<DataRow>(TABLE, {
      household_id: access.householdId,
      id: ingredientId.trim(),
    })
    if (!existingRow) throw new Error('The requested ingredient was not found.')

    const existing = mapIngredientDocument(existingRow)
    const row = await upsertRow<DataRow>(TABLE, {
      household_id: access.householdId,
      id: existing.id,
      data: {
        ...existingRow.data,
        ...buildIngredientData(input, access.user.id, existing),
      },
      updated_by: access.user.id,
    })

    return mapIngredientDocument(row)
  })
}

export async function deleteIngredient(
  context: CloudServiceContext,
  ingredientId: string,
): Promise<void> {
  return withServiceError('Could not delete ingredient', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    await deleteRows(TABLE, {
      household_id: access.householdId,
      id: ingredientId.trim(),
    })
  })
}
