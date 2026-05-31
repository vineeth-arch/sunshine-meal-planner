import type { UserProfile } from '../../types/domain'

export function isAdmin(profile: UserProfile | null): boolean {
  return profile?.role === 'admin'
}

export function canEdit(profile: UserProfile | null): boolean {
  return profile?.role === 'admin' || profile?.role === 'editor'
}

export function canView(profile: UserProfile | null): boolean {
  return profile !== null
}

export function canManageProfiles(profile: UserProfile | null): boolean {
  return isAdmin(profile)
}
