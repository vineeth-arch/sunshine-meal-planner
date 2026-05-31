import { doc, getDoc, Timestamp } from 'firebase/firestore'

import { getFirebaseServices } from '../../lib/firebase'
import type { Household, ProfileKey, UserProfile, UserRole } from '../../types/domain'

const USER_ROLES: UserRole[] = ['admin', 'editor', 'viewer']
const PROFILE_KEYS: ProfileKey[] = ['admin', 'mom', 'dad', 'guest']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asTimestamp(value: unknown, fieldName: string): Timestamp {
  if (value instanceof Timestamp) return value
  throw new Error(`Profile data is invalid: ${fieldName} must be a Firestore timestamp.`)
}

function asOptionalTimestamp(value: unknown, fieldName: string): Timestamp | null {
  if (value === undefined || value === null) return null
  return asTimestamp(value, fieldName)
}

function asString(value: unknown, fieldName: string): string {
  if (typeof value === 'string' && value.trim()) return value
  throw new Error(`Profile data is invalid: ${fieldName} is required.`)
}

function asUserRole(value: unknown): UserRole {
  if (typeof value === 'string' && USER_ROLES.includes(value as UserRole)) return value as UserRole
  throw new Error('Profile data is invalid: role must be admin, editor, or viewer.')
}

function asProfileKey(value: unknown): ProfileKey {
  if (typeof value === 'string' && PROFILE_KEYS.includes(value as ProfileKey)) return value as ProfileKey
  throw new Error('Profile data is invalid: profileKey must be admin, mom, dad, or guest.')
}

export function mapUserProfile(uid: string, data: unknown): UserProfile {
  if (!isRecord(data)) {
    throw new Error('Profile data is invalid: expected a Firestore object.')
  }

  return {
    uid,
    displayName: asString(data.displayName, 'displayName'),
    role: asUserRole(data.role),
    householdId: asString(data.householdId, 'householdId'),
    profileKey: asProfileKey(data.profileKey),
    createdAt: asTimestamp(data.createdAt, 'createdAt'),
    updatedAt: asTimestamp(data.updatedAt, 'updatedAt'),
    lastLoginAt: asOptionalTimestamp(data.lastLoginAt, 'lastLoginAt'),
  }
}

export function mapHousehold(id: string, data: unknown): Household {
  if (!isRecord(data)) {
    throw new Error('Household data is invalid: expected a Firestore object.')
  }

  return {
    id,
    name: asString(data.name, 'name'),
    ownerUid: asString(data.ownerUid, 'ownerUid'),
    createdAt: asTimestamp(data.createdAt, 'createdAt'),
    updatedAt: asTimestamp(data.updatedAt, 'updatedAt'),
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const services = getFirebaseServices()
  if (!services) throw new Error('Firebase is not configured.')

  const snapshot = await getDoc(doc(services.db, 'users', uid))
  if (!snapshot.exists()) return null

  return mapUserProfile(snapshot.id, snapshot.data())
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const services = getFirebaseServices()
  if (!services) throw new Error('Firebase is not configured.')

  const snapshot = await getDoc(doc(services.db, 'households', householdId))
  if (!snapshot.exists()) return null

  return mapHousehold(snapshot.id, snapshot.data())
}
