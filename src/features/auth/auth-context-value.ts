import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import type { UserProfile } from '../../types/domain'

export type AuthProfileState = 'idle' | 'loading' | 'ready' | 'setup-required' | 'error'

export interface AuthContextValue {
  enabled: boolean
  loading: boolean
  user: User | null
  session: Session | null
  profile: UserProfile | null
  error: string | null
  profileState: AuthProfileState
  signInWithGoogle(): Promise<void>
  signInWithMagicLink(email: string): Promise<void>
  signOutUser(): Promise<void>
  refreshProfile(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
