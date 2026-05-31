import { deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'

import type { StapleDocument } from '../../types/domain'
import {
  asRecord,
  asString,
  asTimestamp,
  readRequiredDoc,
  requireHouseholdAccess,
  sortByName,
  withServiceError,
  type FirestoreServiceContext,
} from './firestoreDataService'

function normalizeStapleId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function mapStapleDocument(id: string, data: unknown): StapleDocument {
  const record = asRecord(data, 'Staple data')

  return {
    id,
    name: asString(record.name, 'name'),
    createdBy: asString(record.createdBy, 'createdBy'),
    updatedBy: asString(record.updatedBy, 'updatedBy'),
    createdAt: asTimestamp(record.createdAt, 'createdAt'),
    updatedAt: asTimestamp(record.updatedAt, 'updatedAt'),
  }
}

export async function getStaples(context: FirestoreServiceContext): Promise<StapleDocument[]> {
  return withServiceError('Could not load staples', async () => {
    const access = requireHouseholdAccess(context)
    const snapshot = await getDocs(access.collections.staples)
    return sortByName(snapshot.docs.map((entry) => mapStapleDocument(entry.id, entry.data())))
  })
}

export async function upsertStaple(
  context: FirestoreServiceContext,
  name: string,
): Promise<StapleDocument> {
  return withServiceError('Could not save staple', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const normalizedName = name.trim().toLowerCase()
    if (!normalizedName) {
      throw new Error('Staple name is required.')
    }

    const stapleRef = doc(access.collections.staples, normalizeStapleId(normalizedName))
    const existing = await getDoc(stapleRef)
    await setDoc(
      stapleRef,
      {
        name: normalizedName,
        createdBy: existing.exists() ? existing.data()?.createdBy ?? access.user.uid : access.user.uid,
        updatedBy: access.user.uid,
        createdAt: existing.exists() ? existing.data()?.createdAt ?? serverTimestamp() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    return readRequiredDoc(stapleRef, mapStapleDocument, 'The staple could not be loaded after save.')
  })
}

export async function deleteStaple(context: FirestoreServiceContext, name: string): Promise<void> {
  return withServiceError('Could not delete staple', async () => {
    const access = requireHouseholdAccess(context, { requireEdit: true })
    const stapleRef = doc(access.collections.staples, normalizeStapleId(name))
    await readRequiredDoc(stapleRef, mapStapleDocument, 'The requested staple was not found.')
    await deleteDoc(stapleRef)
  })
}

export function getStapleId(name: string) {
  return normalizeStapleId(name)
}
