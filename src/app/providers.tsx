import type { PropsWithChildren } from 'react'

import { PwaStatusViewport } from '../components/ui/PwaStatusBanners'
import { AuthProvider } from '../features/auth/auth-context'
import { LocalKitchenProvider } from './local-kitchen-context'
import { PwaStatusProvider } from './pwa-context'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <PwaStatusProvider>
      <PwaStatusViewport />
      <AuthProvider>
        <LocalKitchenProvider>{children}</LocalKitchenProvider>
      </AuthProvider>
    </PwaStatusProvider>
  )
}
