import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'

import { AuthAdminDeniedScreen } from './AuthAdminDeniedScreen'
import { AuthLoadingScreen } from './AuthLoadingScreen'
import { AuthProfileErrorScreen } from './AuthProfileErrorScreen'
import { AuthSetupRequiredScreen } from './AuthSetupRequiredScreen'
import { canView, isAdmin, isSuperadmin } from './access'
import { useAuth } from './use-auth'

export function RequireAuth({ children }: PropsWithChildren) {
  const { loading, user, profile, profileState, error, refreshProfile, signOutUser } = useAuth()

  if (loading) return <AuthLoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profileState === 'loading') {
    return (
      <AuthLoadingScreen
        title="Loading your kitchen profile"
        description="Mom's Kitchen is fetching your Supabase access profile before opening the app."
      />
    )
  }
  if (profileState === 'setup-required') {
    return <AuthSetupRequiredScreen email={user.email} onSignOut={signOutUser} />
  }
  if (profileState === 'error') {
    return <AuthProfileErrorScreen error={error ?? 'Could not load profile.'} onRetry={refreshProfile} onSignOut={signOutUser} />
  }
  if (!canView(profile)) return <Navigate to="/login" replace />

  return children
}

export function RequireAdmin({ children }: PropsWithChildren) {
  const { loading, user, profile, profileState } = useAuth()

  if (loading || (user && profileState === 'loading')) return <AuthLoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin(profile) && !isSuperadmin(profile)) return <AuthAdminDeniedScreen />

  return children
}

export function PublicOnlyRoute({ children }: PropsWithChildren) {
  const { loading, user } = useAuth()

  if (loading) return <AuthLoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />

  return children
}
