import type {
  HouseholdSettingsDocument,
  UpdateHouseholdSettingsInput,
} from '../../types/domain'
import {
  mapHouseholdSettingsDocument,
  requireHouseholdAccess,
  selectRow,
  upsertRow,
  withServiceError,
  type CloudServiceContext,
  type SettingsRow,
} from './supabaseDataService'

export async function getHouseholdSettings(
  context: CloudServiceContext,
): Promise<HouseholdSettingsDocument | null> {
  return withServiceError('Could not load household settings', async () => {
    const access = requireHouseholdAccess(context)
    const row = await selectRow<SettingsRow>('household_settings', {
      household_id: access.householdId,
    })

    return mapHouseholdSettingsDocument(row)
  })
}

export async function updateHouseholdSettings(
  context: CloudServiceContext,
  input: UpdateHouseholdSettingsInput,
): Promise<HouseholdSettingsDocument> {
  return withServiceError('Could not update household settings', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const current = await getHouseholdSettings(context)
    const row = await upsertRow<SettingsRow>('household_settings', {
      household_id: access.householdId,
      data: {
        schemaVersion: input.schemaVersion ?? current?.schemaVersion ?? 1,
        regionPreferences: input.regionPreferences ?? current?.regionPreferences ?? [],
        enabledMealTypes: input.enabledMealTypes ?? current?.enabledMealTypes ?? ['breakfast', 'lunch', 'dinner'],
        roleLabels: input.roleLabels ?? current?.roleLabels,
      },
      updated_by: access.user.id,
    })

    const settings = mapHouseholdSettingsDocument(row)
    if (!settings) throw new Error('The updated household settings could not be loaded.')
    return settings
  })
}
