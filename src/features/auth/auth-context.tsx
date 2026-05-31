import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'

import { getFirebaseConfigError, getFirebaseServices, hasFirebaseConfig } from '../../lib/firebase'
import { ensureUserProfile } from '../../services/firestore/household'
import type { UserProfile } from '../../types/domain'
import { AuthContext, type AuthContextValue } from './auth-context-value'

export function AuthProvider({ children }: PropsWithChildren) {
  const enabled = hasFirebaseConfig()
  const configError = getFirebaseConfigError()
  const [loading, setLoading] = useState(enabled)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(configError)

  const refreshProfileForUser = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null)
      setError(configError)
      return
    }

    try {
      const nextProfile = await ensureUserProfile(nextUser)
      setProfile(nextProfile)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load profile.')
    }
  }, [configError])

  useEffect(() => {
    const services = getFirebaseServices()
    if (!services) return

    return onAuthStateChanged(services.auth, async (nextUser) => {
      setUser(nextUser)
      await refreshProfileForUser(nextUser)
      setLoading(false)
    })
  }, [refreshProfileForUser])

  const value = useMemo<AuthContextValue>(
    () => ({
      enabled,
      loading,
      user,
      profile,
      error,
      async signIn(email, password) {
        const services = getFirebaseServices()
        if (!services) throw new Error('Firebase is not configured.')
        await signInWithEmailAndPassword(services.auth, email, password)
      },
      async signOutUser() {
        const services = getFirebaseServices()
        if (!services) return
        await signOut(services.auth)
      },
      async refreshProfile() {
        await refreshProfileForUser(user)
      },
    }),
    [enabled, loading, user, profile, error, refreshProfileForUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
