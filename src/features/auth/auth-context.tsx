import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'

import { getFriendlyFirebaseDataErrorMessage } from '../../lib/firebase/error-messages'
import { getFirebaseConfigError, getFirebaseServices, hasFirebaseConfig } from '../../lib/firebase'
import { getUserProfile } from '../../services/firestore/firestoreProfileService'
import type { UserProfile } from '../../types/domain'
import { AuthContext, type AuthContextValue } from './auth-context-value'
import {
  buildMockAuthSnapshot,
  isMockAuthEnabled,
  persistMockAuthState,
  readMockAuthState,
  resolveMockStateForEmail,
  TEST_AUTH_STORAGE_KEY,
} from './test-auth'

export function AuthProvider({ children }: PropsWithChildren) {
  const mockAuthEnabled = isMockAuthEnabled()
  const initialMockSnapshot = mockAuthEnabled ? buildMockAuthSnapshot(readMockAuthState()) : null
  const enabled = mockAuthEnabled || hasFirebaseConfig()
  const configError = mockAuthEnabled ? null : getFirebaseConfigError()
  const [loading, setLoading] = useState(initialMockSnapshot?.loading ?? enabled)
  const [user, setUser] = useState<User | null>(initialMockSnapshot?.user ?? null)
  const [profile, setProfile] = useState<UserProfile | null>(initialMockSnapshot?.profile ?? null)
  const [error, setError] = useState<string | null>(initialMockSnapshot?.error ?? configError)
  const [profileState, setProfileState] = useState<AuthContextValue['profileState']>(
    initialMockSnapshot?.profileState ?? (enabled ? 'loading' : 'idle'),
  )

  const applyMockSnapshot = useCallback(() => {
    const snapshot = buildMockAuthSnapshot(readMockAuthState())
    setLoading(snapshot.loading)
    setUser(snapshot.user)
    setProfile(snapshot.profile)
    setError(snapshot.error)
    setProfileState(snapshot.profileState)
  }, [])

  const refreshProfileForUser = useCallback(async (nextUser: User | null) => {
    if (mockAuthEnabled) {
      applyMockSnapshot()
      return
    }

    if (!nextUser) {
      setProfile(null)
      setError(configError)
      setProfileState(enabled ? 'idle' : 'error')
      return
    }

    setProfileState('loading')

    try {
      const nextProfile = await getUserProfile(nextUser.uid)
      if (!nextProfile) {
        setProfile(null)
        setError('No Firestore profile exists for this account yet.')
        setProfileState('setup-required')
        return
      }

      setProfile(nextProfile)
      setError(null)
      setProfileState('ready')
    } catch (caught) {
      setProfile(null)
      setError(getFriendlyFirebaseDataErrorMessage('Could not load profile', caught))
      setProfileState('error')
    }
  }, [applyMockSnapshot, configError, enabled, mockAuthEnabled])

  useEffect(() => {
    if (mockAuthEnabled) {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === TEST_AUTH_STORAGE_KEY) {
          applyMockSnapshot()
        }
      }

      window.addEventListener('storage', handleStorage)
      return () => window.removeEventListener('storage', handleStorage)
    }

    const services = getFirebaseServices()
    if (!services) return

    return onAuthStateChanged(services.auth, async (nextUser) => {
      setUser(nextUser)
      await refreshProfileForUser(nextUser)
      setLoading(false)
    })
  }, [applyMockSnapshot, mockAuthEnabled, refreshProfileForUser])

  const value = useMemo<AuthContextValue>(
    () => ({
      enabled,
      loading,
      user,
      profile,
      error,
      profileState,
      async signIn(email, password) {
        if (mockAuthEnabled) {
          void password
          persistMockAuthState(resolveMockStateForEmail(email))
          applyMockSnapshot()
          return
        }

        const services = getFirebaseServices()
        if (!services) throw new Error('Firebase is not configured.')
        await signInWithEmailAndPassword(services.auth, email, password)
      },
      async signOutUser() {
        if (mockAuthEnabled) {
          persistMockAuthState('logged-out')
          applyMockSnapshot()
          return
        }

        const services = getFirebaseServices()
        if (!services) return
        await signOut(services.auth)
      },
      async refreshProfile() {
        await refreshProfileForUser(user)
      },
    }),
    [applyMockSnapshot, enabled, error, loading, mockAuthEnabled, profile, profileState, refreshProfileForUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
