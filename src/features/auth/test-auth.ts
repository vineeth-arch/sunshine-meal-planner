import type { Session, User } from '@supabase/supabase-js'

import type { AuthContextValue } from './auth-context-value'
import type { UserProfile, UserRole } from '../../types/domain'

export const TEST_AUTH_STORAGE_KEY = 'mk:e2e-auth-state'

export type MockAuthState = 'logged-out' | 'admin' | 'editor' | 'member'

type MockProfileSeed = {
  displayName: string
  email: string
  role: UserRole
  isSuperadmin?: boolean
}

const MOCK_PROFILES: Record<Exclude<MockAuthState, 'logged-out'>, MockProfileSeed> = {
  admin: {
    displayName: 'Admin',
    email: 'admin@example.test',
    role: 'admin',
  },
  editor: {
    displayName: 'Mom',
    email: 'editor@example.test',
    role: 'editor',
  },
  member: {
    displayName: 'Member',
    email: 'member@example.test',
    role: 'member',
  },
}

const FALLBACK_TIMESTAMP = '2026-01-01T00:00:00.000Z'

export function isMockAuthEnabled() {
  return import.meta.env.VITE_E2E_AUTH_MODE === 'mock'
}

export function isMockAuthState(value: string | null | undefined): value is MockAuthState {
  return value === 'logged-out' || value === 'admin' || value === 'editor' || value === 'member'
}

export function readMockAuthState(): MockAuthState {
  if (typeof window === 'undefined') return 'logged-out'

  const urlValue = new URLSearchParams(window.location.search).get('mockAuth')
  if (isMockAuthState(urlValue)) {
    window.localStorage.setItem(TEST_AUTH_STORAGE_KEY, urlValue)
    return urlValue
  }

  const storedValue = window.localStorage.getItem(TEST_AUTH_STORAGE_KEY)
  return isMockAuthState(storedValue) ? storedValue : 'logged-out'
}

function buildMockUser(email: string, uid: string): User {
  return { email, id: uid } as User
}

function buildMockSession(user: User): Session {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  } as Session
}

function buildMockProfile(state: Exclude<MockAuthState, 'logged-out'>): UserProfile {
  const seed = MOCK_PROFILES[state]

  return {
    uid: `${state}-uid`,
    role: seed.role,
    householdId: 'mock-household',
    isSuperadmin: seed.isSuperadmin === true,
    displayName: seed.displayName,
    email: seed.email,
    createdAt: FALLBACK_TIMESTAMP,
    updatedAt: FALLBACK_TIMESTAMP,
    lastLoginAt: FALLBACK_TIMESTAMP,
  }
}

export function buildMockAuthSnapshot(state: MockAuthState): Pick<AuthContextValue, 'loading' | 'user' | 'session' | 'profile' | 'error' | 'profileState'> {
  if (state === 'logged-out') {
    return {
      loading: false,
      user: null,
      session: null,
      profile: null,
      error: null,
      profileState: 'idle',
    }
  }

  const profile = buildMockProfile(state)
  const user = buildMockUser(MOCK_PROFILES[state].email, profile.uid)

  return {
    loading: false,
    user,
    session: buildMockSession(user),
    profile,
    error: null,
    profileState: 'ready',
  }
}

export function resolveMockStateForEmail(email: string): MockAuthState {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === MOCK_PROFILES.admin.email) return 'admin'
  if (normalizedEmail === MOCK_PROFILES.member.email) return 'member'
  return 'editor'
}

export function persistMockAuthState(state: MockAuthState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TEST_AUTH_STORAGE_KEY, state)
}
