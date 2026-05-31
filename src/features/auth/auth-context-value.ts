import { createContext } from 'react'
import type { User } from 'firebase/auth'

import type { UserProfile } from '../../types/domain'

export type AuthProfileState = 'idle' | 'loading' | 'ready' | 'setup-required' | 'error'

export interface AuthContextValue {
  enabled: boolean
  loading: boolean
  user: User | null
  profile: UserProfile | null
  error: string | null
  profileState: AuthProfileState
  signIn(email: string, password: string): Promise<void>
  signOutUser(): Promise<void>
  refreshProfile(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
