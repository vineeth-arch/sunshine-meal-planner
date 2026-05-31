import type { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'

import type { UserProfile, UserRole } from '../../types/domain'
import { canEdit, canManageProfiles, canView, isAdmin } from './access'

function createProfile(role: UserRole): UserProfile {
  return {
    uid: `${role}-uid`,
    role,
    householdId: 'household-1',
    profileKey: role === 'admin' ? 'admin' : role === 'editor' ? 'mom' : 'guest',
    displayName: `${role} profile`,
    createdAt: null as unknown as Timestamp,
    updatedAt: null as unknown as Timestamp,
    lastLoginAt: null,
  }
}

describe('access helpers', () => {
  it('treats only admin profiles as admins', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(createProfile('viewer'))).toBe(false)
    expect(isAdmin(createProfile('editor'))).toBe(false)
    expect(isAdmin(createProfile('admin'))).toBe(true)
  })

  it('allows editors and admins to edit', () => {
    expect(canEdit(null)).toBe(false)
    expect(canEdit(createProfile('viewer'))).toBe(false)
    expect(canEdit(createProfile('editor'))).toBe(true)
    expect(canEdit(createProfile('admin'))).toBe(true)
  })

  it('allows any loaded profile to view', () => {
    expect(canView(null)).toBe(false)
    expect(canView(createProfile('viewer'))).toBe(true)
    expect(canView(createProfile('editor'))).toBe(true)
    expect(canView(createProfile('admin'))).toBe(true)
  })

  it('reserves profile management for admins', () => {
    expect(canManageProfiles(null)).toBe(false)
    expect(canManageProfiles(createProfile('viewer'))).toBe(false)
    expect(canManageProfiles(createProfile('editor'))).toBe(false)
    expect(canManageProfiles(createProfile('admin'))).toBe(true)
  })
})
