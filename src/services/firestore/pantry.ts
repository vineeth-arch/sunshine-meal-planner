import { deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'

import type { PantryItemDocument, UpsertPantryItemInput } from '../../types/domain'
import {
  asOptionalString,
  asRecord,
  asString,
  asTimestamp,
  readRequiredDoc,
  requireHouseholdAccess,
  sortByName,
  withServiceError,
  type FirestoreServiceContext,
} from './firestoreDataService'

function mapPantryItemDocument(id: string, data: unknown): PantryItemDocument {
  const record = asRecord(data, 'Pantry item data')

  return {
    id,
    ingredientId: asString(record.ingredientId, 'ingredientId'),
    kind: (record.kind === 'staple' ? 'staple' : 'ingredient'),
    name: asString(record.name, 'name'),
    quantity: asOptionalString(record.quantity, 'quantity'),
    unit: asOptionalString(record.unit, 'unit'),
    status: asString(record.status, 'status'),
    updatedBy: asString(record.updatedBy, 'updatedBy'),
    updatedAt: asTimestamp(record.updatedAt, 'updatedAt'),
  }
}

export async function getPantryItems(context: FirestoreServiceContext): Promise<PantryItemDocument[]> {
  return withServiceError('Could not load pantry items', async () => {
    const access = requireHouseholdAccess(context)
    const snapshot = await getDocs(access.collections.pantryItems)
    return sortByName(snapshot.docs.map((entry) => mapPantryItemDocument(entry.id, entry.data())))
  })
}

export async function upsertPantryItem(
  context: FirestoreServiceContext,
  input: UpsertPantryItemInput,
): Promise<PantryItemDocument> {
  return withServiceError('Could not save pantry item', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const itemId = input.ingredientId.trim()
    if (!itemId) {
      throw new Error('ingredientId is required.')
    }

    const itemRef = doc(access.collections.pantryItems, itemId)
    await setDoc(
      itemRef,
      {
        ingredientId: itemId,
        kind: input.kind === 'staple' ? 'staple' : 'ingredient',
        name: input.name.trim(),
        quantity: input.quantity.trim(),
        unit: input.unit.trim(),
        status: input.status.trim(),
        updatedBy: access.user.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    return readRequiredDoc(itemRef, mapPantryItemDocument, 'The pantry item could not be loaded.')
  })
}

export async function deletePantryItem(
  context: FirestoreServiceContext,
  itemId: string,
): Promise<void> {
  return withServiceError('Could not delete pantry item', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const itemRef = doc(access.collections.pantryItems, itemId.trim())
    await deleteDoc(itemRef)
  })
}
