import { describe, expect, it } from 'vitest'

import type { UserProfile, UserRole } from '../../types/domain'
import { canEdit, canManageProfiles, canView, isAdmin, isSuperadmin } from './access'

function createProfile(role: UserRole, isPlatformSuperadmin = false): UserProfile {
  return {
    uid: `${role}-uid`,
    role,
    householdId: 'household-1',
    isSuperadmin: isPlatformSuperadmin,
    displayName: `${role} profile`,
    email: `${role}@example.test`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: null,
  }
}

describe('access helpers', () => {
  it('treats only admin profiles as household admins', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(createProfile('member'))).toBe(false)
    expect(isAdmin(createProfile('editor'))).toBe(false)
    expect(isAdmin(createProfile('admin'))).toBe(true)
  })

  it('detects platform superadmins separately', () => {
    expect(isSuperadmin(null)).toBe(false)
    expect(isSuperadmin(createProfile('member'))).toBe(false)
    expect(isSuperadmin(createProfile('member', true))).toBe(true)
  })

  it('allows editors and admins to edit', () => {
    expect(canEdit(null)).toBe(false)
    expect(canEdit(createProfile('member'))).toBe(false)
    expect(canEdit(createProfile('editor'))).toBe(true)
    expect(canEdit(createProfile('admin'))).toBe(true)
  })

  it('allows any loaded profile to view', () => {
    expect(canView(null)).toBe(false)
    expect(canView(createProfile('member'))).toBe(true)
    expect(canView(createProfile('editor'))).toBe(true)
    expect(canView(createProfile('admin'))).toBe(true)
  })

  it('reserves profile management for admins and superadmins', () => {
    expect(canManageProfiles(null)).toBe(false)
    expect(canManageProfiles(createProfile('member'))).toBe(false)
    expect(canManageProfiles(createProfile('editor'))).toBe(false)
    expect(canManageProfiles(createProfile('admin'))).toBe(true)
    expect(canManageProfiles(createProfile('member', true))).toBe(true)
  })
})
