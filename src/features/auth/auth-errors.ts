import { FirebaseError } from 'firebase/app'

export function getFriendlyAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'That password does not match this profile. Please try again.'
      case 'auth/user-not-found':
      case 'auth/invalid-login-credentials':
        return 'This profile account is not available yet. Create it first in Firebase Console, then try again.'
      case 'auth/network-request-failed':
        return 'We could not reach Firebase. Check your internet connection and try again.'
      case 'auth/api-key-not-valid':
      case 'auth/app-not-authorized':
      case 'auth/invalid-api-key':
      case 'auth/operation-not-allowed':
        return 'Firebase is not configured correctly for this app yet. Check your Firebase project settings and enabled sign-in methods.'
      default:
        return error.message || 'We could not sign you in right now. Please try again.'
    }
  }

  if (error instanceof Error) return error.message

  return 'We could not sign you in right now. Please try again.'
}
