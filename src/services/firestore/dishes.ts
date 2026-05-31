import { addDoc, deleteDoc, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore'

import type { CreateDishInput, DishDocument, UpdateDishInput } from '../../types/domain'
import {
  asDishCategory,
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

function mapDishDocument(id: string, data: unknown): DishDocument {
  const record = asRecord(data, 'Dish data')

  return {
    id,
    name: asString(record.name, 'name'),
    category: asDishCategory(record.category),
    emoji: asString(record.emoji, 'emoji'),
    recipe: asOptionalString(record.recipe, 'recipe'),
    youtubeUrl: asOptionalString(record.youtubeUrl, 'youtubeUrl'),
    referenceText: asOptionalString(record.referenceText, 'referenceText'),
    imageUrl: asOptionalString(record.imageUrl, 'imageUrl'),
    createdBy: asString(record.createdBy, 'createdBy'),
    updatedBy: asString(record.updatedBy, 'updatedBy'),
    createdAt: asTimestamp(record.createdAt, 'createdAt'),
    updatedAt: asTimestamp(record.updatedAt, 'updatedAt'),
  }
}

export async function getDishes(context: FirestoreServiceContext): Promise<DishDocument[]> {
  return withServiceError('Could not load dishes', async () => {
    const access = requireHouseholdAccess(context)
    const snapshot = await getDocs(access.collections.dishes)
    return sortByName(snapshot.docs.map((entry) => mapDishDocument(entry.id, entry.data())))
  })
}

export async function createDish(
  context: FirestoreServiceContext,
  input: CreateDishInput,
): Promise<DishDocument> {
  return withServiceError('Could not create dish', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const docRef = await addDoc(access.collections.dishes, {
      name: input.name.trim(),
      category: input.category,
      emoji: input.emoji?.trim() || '🍽️',
      recipe: input.recipe?.trim() ?? '',
      youtubeUrl: input.youtubeUrl?.trim() ?? '',
      referenceText: input.referenceText?.trim() ?? '',
      imageUrl: input.imageUrl?.trim() ?? '',
      createdBy: access.user.uid,
      updatedBy: access.user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return readRequiredDoc(docRef, mapDishDocument, 'The new dish could not be loaded after creation.')
  })
}

export async function updateDish(
  context: FirestoreServiceContext,
  dishId: string,
  input: UpdateDishInput,
): Promise<DishDocument> {
  return withServiceError('Could not update dish', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const dishRef = doc(access.collections.dishes, dishId.trim())
    await readRequiredDoc(dishRef, mapDishDocument, 'The requested dish was not found.')

    const payload: Record<string, unknown> = {
      updatedBy: access.user.uid,
      updatedAt: serverTimestamp(),
    }

    if (input.name !== undefined) payload.name = input.name.trim()
    if (input.category !== undefined) payload.category = input.category
    if (input.emoji !== undefined) payload.emoji = input.emoji.trim()
    if (input.recipe !== undefined) payload.recipe = input.recipe.trim()
    if (input.youtubeUrl !== undefined) payload.youtubeUrl = input.youtubeUrl.trim()
    if (input.referenceText !== undefined) payload.referenceText = input.referenceText.trim()
    if (input.imageUrl !== undefined) payload.imageUrl = input.imageUrl.trim()

    await setDoc(dishRef, payload, { merge: true })
    return readRequiredDoc(dishRef, mapDishDocument, 'The updated dish could not be loaded.')
  })
}

export async function deleteDish(context: FirestoreServiceContext, dishId: string): Promise<void> {
  return withServiceError('Could not delete dish', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const dishRef = doc(access.collections.dishes, dishId.trim())
    await readRequiredDoc(dishRef, mapDishDocument, 'The requested dish was not found.')
    await deleteDoc(dishRef)
  })
}
