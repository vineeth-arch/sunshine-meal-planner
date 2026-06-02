import type { StapleDocument } from '../../types/domain'
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

const TABLE = 'staples'

function normalizeStapleId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function getStapleId(name: string) {
  return normalizeStapleId(name)
}

export function mapStapleDocument(row: DataRow): StapleDocument {
  const record = asRecord(row.data ?? {}, 'Staple data')

  return {
    id: row.id,
    name: asString(record.name, 'name'),
    createdBy: asOptionalString(record.createdBy, 'createdBy') || row.updated_by || '',
    updatedBy: row.updated_by || asOptionalString(record.updatedBy, 'updatedBy'),
    createdAt: asTimestamp(record.createdAt ?? row.updated_at, 'createdAt'),
    updatedAt: asTimestamp(row.updated_at, 'updatedAt'),
  }
}

export async function getStaples(context: CloudServiceContext): Promise<StapleDocument[]> {
  return withServiceError('Could not load staples', async () => {
    const access = requireHouseholdAccess(context)
    const rows = await selectRows<DataRow>(TABLE, access.householdId)
    return sortByName(rows.map(mapStapleDocument))
  })
}

export async function upsertStaple(
  context: CloudServiceContext,
  name: string,
): Promise<StapleDocument> {
  return withServiceError('Could not save staple', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const normalizedName = name.trim().toLowerCase()
    if (!normalizedName) {
      throw new Error('Staple name is required.')
    }

    const id = normalizeStapleId(normalizedName)
    const existingRow = await selectRow<DataRow>(TABLE, {
      household_id: access.householdId,
      id,
    })
    const existing = existingRow ? mapStapleDocument(existingRow) : null
    const row = await upsertRow<DataRow>(TABLE, {
      household_id: access.householdId,
      id,
      data: {
        ...(existingRow?.data ?? {}),
        name: normalizedName,
        createdBy: existing?.createdBy ?? access.user.id,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedBy: access.user.id,
      },
      updated_by: access.user.id,
    })

    return mapStapleDocument(row)
  })
}

export async function deleteStaple(context: CloudServiceContext, name: string): Promise<void> {
  return withServiceError('Could not delete staple', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    await deleteRows(TABLE, {
      household_id: access.householdId,
      id: normalizeStapleId(name),
    })
  })
}
