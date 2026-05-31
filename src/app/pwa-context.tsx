import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

type PwaStatusContextValue = {
  isOffline: boolean
  needRefresh: boolean
  dismissUpdate(): void
  applyUpdate(): Promise<void>
}

const PwaStatusContext = createContext<PwaStatusContextValue | null>(null)

export function PwaStatusProvider({ children }: PropsWithChildren) {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
    }

    function handleOffline() {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const value = useMemo<PwaStatusContextValue>(() => ({
    isOffline,
    needRefresh,
    dismissUpdate() {
      setNeedRefresh(false)
    },
    async applyUpdate() {
      await updateServiceWorker(true)
    },
  }), [isOffline, needRefresh, setNeedRefresh, updateServiceWorker])

  return <PwaStatusContext.Provider value={value}>{children}</PwaStatusContext.Provider>
}

export function usePwaStatus() {
  const context = useContext(PwaStatusContext)
  if (!context) {
    throw new Error('usePwaStatus must be used inside PwaStatusProvider')
  }

  return context
}
