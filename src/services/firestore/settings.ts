import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import type {
  HouseholdSettingsDocument,
  UpdateHouseholdSettingsInput,
} from '../../types/domain'
import {
  mapHouseholdSettingsDocument,
  readRequiredDoc,
  requireHouseholdAccess,
  withServiceError,
  type FirestoreServiceContext,
} from './firestoreDataService'

export async function getHouseholdSettings(
  context: FirestoreServiceContext,
): Promise<HouseholdSettingsDocument | null> {
  return withServiceError('Could not load household settings', async () => {
    const access = requireHouseholdAccess(context)
    const settingsRef = doc(access.collections.settings, 'app')
    const snapshot = await getDoc(settingsRef)

    return snapshot.exists() ? mapHouseholdSettingsDocument(snapshot.id, snapshot.data()) : null
  })
}

export async function updateHouseholdSettings(
  context: FirestoreServiceContext,
  input: UpdateHouseholdSettingsInput,
): Promise<HouseholdSettingsDocument> {
  return withServiceError('Could not update household settings', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const settingsRef = doc(access.collections.settings, 'app')
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    }

    if (input.schemaVersion !== undefined) payload.schemaVersion = input.schemaVersion
    if (input.regionPreferences !== undefined) payload.regionPreferences = input.regionPreferences
    if (input.enabledMealTypes !== undefined) payload.enabledMealTypes = input.enabledMealTypes
    if (input.roleLabels !== undefined) payload.roleLabels = input.roleLabels

    await setDoc(settingsRef, payload, { merge: true })
    return readRequiredDoc(
      settingsRef,
      mapHouseholdSettingsDocument,
      'The updated household settings could not be loaded.',
    )
  })
}
