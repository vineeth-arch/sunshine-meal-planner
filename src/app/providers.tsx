import type { PropsWithChildren } from 'react'

import { AuthProvider } from '../features/auth/auth-context'
import { LocalKitchenProvider } from './local-kitchen-context'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <LocalKitchenProvider>{children}</LocalKitchenProvider>
    </AuthProvider>
  )
}
