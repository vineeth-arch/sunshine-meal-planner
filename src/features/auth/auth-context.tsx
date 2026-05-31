import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'

import { getFirebaseConfigError, getFirebaseServices, hasFirebaseConfig } from '../../lib/firebase'
import { getUserProfile } from '../../services/firestore/firestoreProfileService'
import type { UserProfile } from '../../types/domain'
import { AuthContext, type AuthContextValue } from './auth-context-value'

export function AuthProvider({ children }: PropsWithChildren) {
  const enabled = hasFirebaseConfig()
  const configError = getFirebaseConfigError()
  const [loading, setLoading] = useState(enabled)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(configError)
  const [profileState, setProfileState] = useState<AuthContextValue['profileState']>(enabled ? 'loading' : 'idle')

  const refreshProfileForUser = useCallback(async (nextUser: User | null) => {
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
      setError(caught instanceof Error ? caught.message : 'Could not load profile.')
      setProfileState('error')
    }
  }, [configError, enabled])

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
      profileState,
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
    [enabled, loading, user, profile, error, profileState, refreshProfileForUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
