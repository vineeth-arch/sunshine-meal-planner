import type { UserProfile } from '../../types/domain'

export function isAdmin(profile: UserProfile | null): boolean {
  return profile?.role === 'admin'
}

export function isSuperadmin(profile: UserProfile | null): boolean {
  return profile?.isSuperadmin === true
}

export function canEdit(profile: UserProfile | null): boolean {
  return profile?.role === 'admin' || profile?.role === 'editor'
}

export function canView(profile: UserProfile | null): boolean {
  return profile !== null || isSuperadmin(profile)
}

export function canManageProfiles(profile: UserProfile | null): boolean {
  return isAdmin(profile) || isSuperadmin(profile)
}
