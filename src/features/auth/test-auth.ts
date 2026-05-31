import type { User } from 'firebase/auth'
import type { Timestamp } from 'firebase/firestore'

import type { AuthContextValue } from './auth-context-value'
import type { ProfileKey, UserProfile, UserRole } from '../../types/domain'

export const TEST_AUTH_STORAGE_KEY = 'mk:e2e-auth-state'

export type MockAuthState = 'logged-out' | 'admin' | 'editor' | 'viewer'

type MockProfileSeed = {
  displayName: string
  email: string
  profileKey: ProfileKey
  role: UserRole
}

const MOCK_PROFILES: Record<Exclude<MockAuthState, 'logged-out'>, MockProfileSeed> = {
  admin: {
    displayName: 'Admin',
    email: 'admin@moms-kitchen.local',
    profileKey: 'admin',
    role: 'admin',
  },
  editor: {
    displayName: 'Mom',
    email: 'mom@moms-kitchen.local',
    profileKey: 'mom',
    role: 'editor',
  },
  viewer: {
    displayName: 'Guest',
    email: 'guest@moms-kitchen.local',
    profileKey: 'guest',
    role: 'viewer',
  },
}

const FALLBACK_TIMESTAMP = null as unknown as Timestamp

export function isMockAuthEnabled() {
  return import.meta.env.VITE_E2E_AUTH_MODE === 'mock'
}

export function isMockAuthState(value: string | null | undefined): value is MockAuthState {
  return value === 'logged-out' || value === 'admin' || value === 'editor' || value === 'viewer'
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
  return { email, uid } as User
}

function buildMockProfile(state: Exclude<MockAuthState, 'logged-out'>): UserProfile {
  const seed = MOCK_PROFILES[state]

  return {
    uid: `${state}-uid`,
    role: seed.role,
    householdId: 'mock-household',
    profileKey: seed.profileKey,
    displayName: seed.displayName,
    createdAt: FALLBACK_TIMESTAMP,
    updatedAt: FALLBACK_TIMESTAMP,
    lastLoginAt: FALLBACK_TIMESTAMP,
  }
}

export function buildMockAuthSnapshot(state: MockAuthState): Pick<AuthContextValue, 'loading' | 'user' | 'profile' | 'error' | 'profileState'> {
  if (state === 'logged-out') {
    return {
      loading: false,
      user: null,
      profile: null,
      error: null,
      profileState: 'idle',
    }
  }

  const profile = buildMockProfile(state)

  return {
    loading: false,
    user: buildMockUser(MOCK_PROFILES[state].email, profile.uid),
    profile,
    error: null,
    profileState: 'ready',
  }
}

export function resolveMockStateForEmail(email: string): MockAuthState {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail === MOCK_PROFILES.admin.email) return 'admin'
  if (normalizedEmail === MOCK_PROFILES.viewer.email) return 'viewer'
  return 'editor'
}

export function persistMockAuthState(state: MockAuthState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TEST_AUTH_STORAGE_KEY, state)
}
