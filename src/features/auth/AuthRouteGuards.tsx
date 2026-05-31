import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'

import { AuthLoadingScreen } from './AuthLoadingScreen'
import { useAuth } from './use-auth'

export function RequireAuth({ children }: PropsWithChildren) {
  const { loading, user } = useAuth()

  if (loading) return <AuthLoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  return children
}

export function PublicOnlyRoute({ children }: PropsWithChildren) {
  const { loading, user } = useAuth()

  if (loading) return <AuthLoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />

  return children
}
