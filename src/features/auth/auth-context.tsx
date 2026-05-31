import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'

import { getFirebaseServices, hasFirebaseConfig } from '../../lib/firebase/client'
import { ensureUserProfile } from '../../services/firestore/household'
import type { UserProfile } from '../../types/domain'
import { AuthContext, type AuthContextValue } from './auth-context-value'

export function AuthProvider({ children }: PropsWithChildren) {
  const enabled = hasFirebaseConfig()
  const [loading, setLoading] = useState(enabled)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refreshProfileForUser(nextUser: User | null) {
    if (!nextUser) {
      setProfile(null)
      return
    }

    try {
      const nextProfile = await ensureUserProfile(nextUser)
      setProfile(nextProfile)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load profile.')
    }
  }

  useEffect(() => {
    const services = getFirebaseServices()
    if (!services) return

    return onAuthStateChanged(services.auth, async (nextUser) => {
      setUser(nextUser)
      await refreshProfileForUser(nextUser)
      setLoading(false)
    })
  }, [])

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
      async signUp(email, password) {
        const services = getFirebaseServices()
        if (!services) throw new Error('Firebase is not configured.')
        await createUserWithEmailAndPassword(services.auth, email, password)
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
    [enabled, loading, user, profile, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
