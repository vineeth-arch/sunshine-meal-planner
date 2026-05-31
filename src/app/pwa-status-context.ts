import { createContext } from 'react'

export type PwaStatusContextValue = {
  isOffline: boolean
  needRefresh: boolean
  dismissUpdate(): void
  applyUpdate(): Promise<void>
}

export const PwaStatusContext = createContext<PwaStatusContextValue | null>(null)
