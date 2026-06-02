import { AuthError } from '@supabase/supabase-js'

export function getFriendlyAuthErrorMessage(error: unknown) {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'invalid_credentials':
      case 'bad_jwt':
      case 'invalid_jwt':
      case 'session_not_found':
        return 'Your cloud session is no longer valid. Sign in again.'
      case 'email_provider_disabled':
      case 'oauth_provider_not_supported':
      case 'provider_disabled':
      case 'validation_failed':
        return 'Supabase sign-in is not configured correctly yet. Check enabled providers and redirect URLs.'
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return 'Too many sign-in attempts. Wait a moment, then try again.'
      default:
        return error.message || 'We could not sign you in right now. Please try again.'
    }
  }

  if (error instanceof TypeError) {
    return 'We could not reach cloud sync. Check your internet connection and try again.'
  }

  if (error instanceof Error) return error.message

  return 'We could not sign you in right now. Please try again.'
}
