import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { getCloudConfigError, isCloudConfigured, supabase } from '../../lib/supabase'
import { getUserProfile } from '../../services/supabase/supabaseProfileService'
import type { UserProfile } from '../../types/domain'
import { AuthContext, type AuthContextValue } from './auth-context-value'
import { getFriendlyAuthErrorMessage } from './auth-errors'
import {
  buildMockAuthSnapshot,
  isMockAuthEnabled,
  persistMockAuthState,
  readMockAuthState,
  TEST_AUTH_STORAGE_KEY,
} from './test-auth'

function getRedirectUrl() {
  return window.location.origin
}

export function AuthProvider({ children }: PropsWithChildren) {
  const mockAuthEnabled = isMockAuthEnabled()
  const initialMockSnapshot = mockAuthEnabled ? buildMockAuthSnapshot(readMockAuthState()) : null
  const enabled = mockAuthEnabled || isCloudConfigured()
  const configError = mockAuthEnabled ? null : getCloudConfigError()
  const [loading, setLoading] = useState(initialMockSnapshot?.loading ?? enabled)
  const [session, setSession] = useState<Session | null>(initialMockSnapshot?.session ?? null)
  const [user, setUser] = useState<User | null>(initialMockSnapshot?.user ?? null)
  const [profile, setProfile] = useState<UserProfile | null>(initialMockSnapshot?.profile ?? null)
  const [error, setError] = useState<string | null>(initialMockSnapshot?.error ?? configError)
  const [profileState, setProfileState] = useState<AuthContextValue['profileState']>(
    initialMockSnapshot?.profileState ?? (enabled ? 'loading' : 'idle'),
  )

  const applyMockSnapshot = useCallback(() => {
    const snapshot = buildMockAuthSnapshot(readMockAuthState())
    setLoading(snapshot.loading)
    setSession(snapshot.session)
    setUser(snapshot.user)
    setProfile(snapshot.profile)
    setError(snapshot.error)
    setProfileState(snapshot.profileState)
  }, [])

  const refreshProfileForSession = useCallback(async (nextSession: Session | null) => {
    if (mockAuthEnabled) {
      applyMockSnapshot()
      return
    }

    if (!supabase) {
      setSession(null)
      setUser(null)
      setProfile(null)
      setError(configError)
      setProfileState('error')
      return
    }

    setSession(nextSession)
    setUser(nextSession?.user ?? null)

    if (!nextSession?.user) {
      setProfile(null)
      setError(configError)
      setProfileState('idle')
      return
    }

    setProfileState('loading')

    try {
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
      if (claimsError) throw claimsError
      if (!claimsData) throw new Error('Could not verify cloud session claims.')
      if (claimsData.claims.sub !== nextSession.user.id) {
        throw new Error('Cloud session claims do not match the signed-in user.')
      }

      const nextProfile = await getUserProfile(nextSession.user.id)
      if (!nextProfile) {
        setProfile(null)
        setError('No Supabase profile exists for this account yet.')
        setProfileState('setup-required')
        return
      }

      setProfile(nextProfile)
      setError(null)
      setProfileState('ready')
    } catch (caught) {
      setProfile(null)
      setError(getFriendlyAuthErrorMessage(caught))
      setProfileState('error')
    }
  }, [applyMockSnapshot, configError, mockAuthEnabled])

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

    if (!supabase) return

    let cancelled = false

    void supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (cancelled) return
      if (sessionError) {
        setError(getFriendlyAuthErrorMessage(sessionError))
        setProfileState('error')
        setLoading(false)
        return
      }

      await refreshProfileForSession(data.session)
      if (!cancelled) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        void refreshProfileForSession(nextSession).finally(() => setLoading(false))
      }, 0)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [applyMockSnapshot, mockAuthEnabled, refreshProfileForSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      enabled,
      loading,
      session,
      user,
      profile,
      error,
      profileState,
      async signInWithGoogle() {
        if (mockAuthEnabled) {
          persistMockAuthState('admin')
          applyMockSnapshot()
          return
        }

        if (!supabase) throw new Error('Cloud sync not configured.')
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: getRedirectUrl() },
        })
        if (signInError) throw signInError
      },
      async signInWithMagicLink(email) {
        if (mockAuthEnabled) {
          persistMockAuthState('editor')
          applyMockSnapshot()
          return
        }

        if (!supabase) throw new Error('Cloud sync not configured.')
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: getRedirectUrl() },
        })
        if (signInError) throw signInError
      },
      async signOutUser() {
        if (mockAuthEnabled) {
          persistMockAuthState('logged-out')
          applyMockSnapshot()
          return
        }

        if (!supabase) return
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) throw signOutError
      },
      async refreshProfile() {
        await refreshProfileForSession(session)
      },
    }),
    [applyMockSnapshot, enabled, error, loading, mockAuthEnabled, profile, profileState, refreshProfileForSession, session, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
