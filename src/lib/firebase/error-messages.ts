import { FirebaseError } from 'firebase/app'

const NETWORK_ERROR_CODES = new Set([
  'app/network-error',
  'auth/network-request-failed',
  'unavailable',
  'deadline-exceeded',
])

export function getFriendlyFirebaseDataErrorMessage(action: string, error: unknown) {
  if (error instanceof FirebaseError) {
    if (NETWORK_ERROR_CODES.has(error.code)) {
      return `${action}: We could not reach the cloud right now. Check your internet connection and try again.`
    }

    if (error.code === 'permission-denied') {
      return `${action}: This profile does not have permission to access that household data.`
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('offline') || message.includes('network') || message.includes('failed to fetch')) {
      return `${action}: We could not reach the cloud right now. Check your internet connection and try again.`
    }
  }

  if (error instanceof Error) {
    return `${action}: ${error.message}`
  }

  return `${action}: Unknown error.`
}
