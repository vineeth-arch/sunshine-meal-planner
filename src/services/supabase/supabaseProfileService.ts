import { requireSupabase } from '../../lib/supabase'
import type { Household, UserProfile, UserRole } from '../../types/domain'

const USER_ROLES: UserRole[] = ['admin', 'editor', 'member']

type ProfileRow = {
  id: string
  role: string
  household_id: string | null
  is_superadmin: boolean | null
  display_name: string | null
  email: string | null
  created_at: string
}

type HouseholdRow = {
  id: string
  name: string | null
  created_by: string | null
  created_at: string
}

function asUserRole(value: unknown): UserRole {
  if (typeof value === 'string' && USER_ROLES.includes(value as UserRole)) return value as UserRole
  throw new Error('Profile data is invalid: role must be admin, editor, or member.')
}

export function mapUserProfile(row: ProfileRow): UserProfile {
  return {
    uid: row.id,
    displayName: row.display_name?.trim() || row.email?.trim() || 'Signed in',
    email: row.email?.trim() ?? '',
    role: asUserRole(row.role),
    householdId: row.household_id?.trim() ?? '',
    isSuperadmin: row.is_superadmin === true,
    createdAt: row.created_at,
    updatedAt: row.created_at,
    lastLoginAt: null,
  }
}

export function mapHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name?.trim() || "Mom's Kitchen",
    ownerUid: row.created_by ?? '',
    createdAt: row.created_at,
    updatedAt: row.created_at,
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, role, household_id, is_superadmin, display_name, email, created_at')
    .eq('id', uid)
    .maybeSingle()

  if (error) throw error
  return data ? mapUserProfile(data as ProfileRow) : null
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const { data, error } = await requireSupabase()
    .from('households')
    .select('id, name, created_by, created_at')
    .eq('id', householdId)
    .maybeSingle()

  if (error) throw error
  return data ? mapHousehold(data as HouseholdRow) : null
}
