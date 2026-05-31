import { useContext } from 'react'

import { PwaStatusContext } from './pwa-status-context'

export function usePwaStatus() {
  const context = useContext(PwaStatusContext)
  if (!context) {
    throw new Error('usePwaStatus must be used inside PwaStatusProvider')
  }

  return context
}
