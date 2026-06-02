import type { CreateDishInput, DishDocument, UpdateDishInput } from '../../types/domain'
import {
  asDishCategory,
  asOptionalString,
  asRecord,
  asString,
  asStringArray,
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

const TABLE = 'dishes'

export function mapDishDocument(row: DataRow): DishDocument {
  const record = asRecord(row.data ?? {}, 'Dish data')

  return {
    id: row.id,
    name: asString(record.name, 'name'),
    category: asDishCategory(record.category),
    mainIngredients: asStringArray(record.mainIngredients ?? [], 'mainIngredients'),
    emoji: asString(record.emoji, 'emoji'),
    recipe: asOptionalString(record.recipe, 'recipe'),
    youtubeUrl: asOptionalString(record.youtubeUrl, 'youtubeUrl'),
    referenceText: asOptionalString(record.referenceText, 'referenceText'),
    imageUrl: asOptionalString(record.imageUrl, 'imageUrl'),
    createdBy: asOptionalString(record.createdBy, 'createdBy') || row.updated_by || '',
    updatedBy: row.updated_by || asOptionalString(record.updatedBy, 'updatedBy'),
    createdAt: asTimestamp(record.createdAt ?? row.updated_at, 'createdAt'),
    updatedAt: asTimestamp(row.updated_at, 'updatedAt'),
  }
}

function normalizeDishId(input: CreateDishInput) {
  const source = input.id?.trim() || input.name.trim().toLowerCase()
  return source.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function buildDishData(input: CreateDishInput | UpdateDishInput, userId: string, existing?: DishDocument): Record<string, unknown> {
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
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.mainIngredients !== undefined ? { mainIngredients: input.mainIngredients.map((item) => item.trim()).filter(Boolean) } : {}),
    ...(input.emoji !== undefined ? { emoji: input.emoji.trim() || '🍽️' } : {}),
    ...(input.recipe !== undefined ? { recipe: input.recipe.trim() } : {}),
    ...(input.youtubeUrl !== undefined ? { youtubeUrl: input.youtubeUrl.trim() } : {}),
    ...(input.referenceText !== undefined ? { referenceText: input.referenceText.trim() } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl.trim() } : {}),
    updatedBy: userId,
  }
}

export async function getDishes(context: CloudServiceContext): Promise<DishDocument[]> {
  return withServiceError('Could not load dishes', async () => {
    const access = requireHouseholdAccess(context)
    const rows = await selectRows<DataRow>(TABLE, access.householdId)
    return sortByName(rows.map(mapDishDocument))
  })
}

export async function createDish(
  context: CloudServiceContext,
  input: CreateDishInput,
): Promise<DishDocument> {
  return withServiceError('Could not create dish', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const row = await upsertRow<DataRow>(TABLE, {
      household_id: access.householdId,
      id: normalizeDishId(input),
      data: buildDishData(input, access.user.id),
      updated_by: access.user.id,
    })

    return mapDishDocument(row)
  })
}

export async function updateDish(
  context: CloudServiceContext,
  dishId: string,
  input: UpdateDishInput,
): Promise<DishDocument> {
  return withServiceError('Could not update dish', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const existingRow = await selectRow<DataRow>(TABLE, {
      household_id: access.householdId,
      id: dishId.trim(),
    })
    if (!existingRow) throw new Error('The requested dish was not found.')

    const existing = mapDishDocument(existingRow)
    const row = await upsertRow<DataRow>(TABLE, {
      household_id: access.householdId,
      id: existing.id,
      data: {
        ...existingRow.data,
        ...buildDishData(input, access.user.id, existing),
      },
      updated_by: access.user.id,
    })

    return mapDishDocument(row)
  })
}

export async function deleteDish(context: CloudServiceContext, dishId: string): Promise<void> {
  return withServiceError('Could not delete dish', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    await deleteRows(TABLE, {
      household_id: access.householdId,
      id: dishId.trim(),
    })
  })
}
