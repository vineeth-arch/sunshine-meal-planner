import { deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'

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
  readRequiredDoc,
  requireHouseholdAccess,
  sortByName,
  withServiceError,
  type FirestoreServiceContext,
} from './firestoreDataService'

function mapIngredientDocument(id: string, data: unknown): IngredientDocument {
  const record = asRecord(data, 'Ingredient data')

  return {
    id,
    name: asString(record.name, 'name'),
    emoji: asString(record.emoji, 'emoji'),
    malayalamName: asOptionalString(record.malayalamName, 'malayalamName'),
    gujaratiName: asOptionalString(record.gujaratiName, 'gujaratiName'),
    imageUrl: asOptionalString(record.imageUrl, 'imageUrl'),
    createdBy: asString(record.createdBy, 'createdBy'),
    updatedBy: asString(record.updatedBy, 'updatedBy'),
    createdAt: asTimestamp(record.createdAt, 'createdAt'),
    updatedAt: asTimestamp(record.updatedAt, 'updatedAt'),
  }
}

function normalizeIngredientId(name: string, fallback?: string) {
  const source = fallback?.trim() || name.trim().toLowerCase()
  return source.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function getIngredients(context: FirestoreServiceContext): Promise<IngredientDocument[]> {
  return withServiceError('Could not load ingredients', async () => {
    const access = requireHouseholdAccess(context)
    const snapshot = await getDocs(access.collections.ingredients)
    return sortByName(snapshot.docs.map((entry) => mapIngredientDocument(entry.id, entry.data())))
  })
}

export async function createIngredient(
  context: FirestoreServiceContext,
  input: CreateIngredientInput,
): Promise<IngredientDocument> {
  return withServiceError('Could not create ingredient', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const docRef = doc(access.collections.ingredients, normalizeIngredientId(input.name, input.id))
    await setDoc(docRef, {
      name: input.name.trim(),
      emoji: input.emoji?.trim() || '🥬',
      malayalamName: input.malayalamName?.trim() ?? '',
      gujaratiName: input.gujaratiName?.trim() ?? '',
      imageUrl: input.imageUrl?.trim() ?? '',
      createdBy: access.user.uid,
      updatedBy: access.user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return readRequiredDoc(
      docRef,
      mapIngredientDocument,
      'The new ingredient could not be loaded after creation.',
    )
  })
}

export function getIngredientId(name: string, fallback?: string) {
  return normalizeIngredientId(name, fallback)
}

export async function updateIngredient(
  context: FirestoreServiceContext,
  ingredientId: string,
  input: UpdateIngredientInput,
): Promise<IngredientDocument> {
  return withServiceError('Could not update ingredient', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const ingredientRef = doc(access.collections.ingredients, ingredientId.trim())
    await readRequiredDoc(ingredientRef, mapIngredientDocument, 'The requested ingredient was not found.')

    const payload: Record<string, unknown> = {
      updatedBy: access.user.uid,
      updatedAt: serverTimestamp(),
    }

    if (input.name !== undefined) payload.name = input.name.trim()
    if (input.emoji !== undefined) payload.emoji = input.emoji.trim()
    if (input.malayalamName !== undefined) payload.malayalamName = input.malayalamName.trim()
    if (input.gujaratiName !== undefined) payload.gujaratiName = input.gujaratiName.trim()
    if (input.imageUrl !== undefined) payload.imageUrl = input.imageUrl.trim()

    await setDoc(ingredientRef, payload, { merge: true })
    return readRequiredDoc(
      ingredientRef,
      mapIngredientDocument,
      'The updated ingredient could not be loaded.',
    )
  })
}

export async function deleteIngredient(
  context: FirestoreServiceContext,
  ingredientId: string,
): Promise<void> {
  return withServiceError('Could not delete ingredient', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const ingredientRef = doc(access.collections.ingredients, ingredientId.trim())
    await readRequiredDoc(ingredientRef, mapIngredientDocument, 'The requested ingredient was not found.')
    await deleteDoc(ingredientRef)
  })
}
