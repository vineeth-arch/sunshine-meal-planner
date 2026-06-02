import type { PantryItemDocument, UpsertPantryItemInput } from '../../types/domain'
import {
  asOptionalString,
  asRecord,
  asString,
  asTimestamp,
  deleteRows,
  requireHouseholdAccess,
  selectRows,
  sortByName,
  upsertRow,
  withServiceError,
  type DataRow,
  type CloudServiceContext,
} from './supabaseDataService'

const TABLE = 'pantry_items'

export function mapPantryItemDocument(row: DataRow): PantryItemDocument {
  const record = asRecord(row.data ?? {}, 'Pantry item data')

  return {
    id: row.id,
    ingredientId: asString(record.ingredientId ?? row.id, 'ingredientId'),
    kind: (record.kind === 'staple' ? 'staple' : 'ingredient'),
    name: asString(record.name, 'name'),
    quantity: asOptionalString(record.quantity, 'quantity'),
    unit: asOptionalString(record.unit, 'unit'),
    status: asString(record.status, 'status'),
    updatedBy: row.updated_by || asOptionalString(record.updatedBy, 'updatedBy'),
    updatedAt: asTimestamp(row.updated_at, 'updatedAt'),
  }
}

export async function getPantryItems(context: CloudServiceContext): Promise<PantryItemDocument[]> {
  return withServiceError('Could not load pantry items', async () => {
    const access = requireHouseholdAccess(context)
    const rows = await selectRows<DataRow>(TABLE, access.householdId)
    return sortByName(rows.map(mapPantryItemDocument))
  })
}

export async function upsertPantryItem(
  context: CloudServiceContext,
  input: UpsertPantryItemInput,
): Promise<PantryItemDocument> {
  return withServiceError('Could not save pantry item', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const itemId = input.ingredientId.trim()
    if (!itemId) {
      throw new Error('ingredientId is required.')
    }

    const row = await upsertRow<DataRow>(TABLE, {
      household_id: access.householdId,
      id: itemId,
      data: {
        ingredientId: itemId,
        kind: input.kind === 'staple' ? 'staple' : 'ingredient',
        name: input.name.trim(),
        quantity: input.quantity.trim(),
        unit: input.unit.trim(),
        status: input.status.trim(),
        updatedBy: access.user.id,
      },
      updated_by: access.user.id,
    })

    return mapPantryItemDocument(row)
  })
}

export async function deletePantryItem(
  context: CloudServiceContext,
  itemId: string,
): Promise<void> {
  return withServiceError('Could not delete pantry item', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    await deleteRows(TABLE, {
      household_id: access.householdId,
      id: itemId.trim(),
    })
  })
}
