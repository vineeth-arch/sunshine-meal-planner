import { AuthError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import { getFriendlyAuthErrorMessage } from './auth-errors'

describe('getFriendlyAuthErrorMessage', () => {
  it('maps invalid Supabase sessions to sign-in guidance', () => {
    expect(getFriendlyAuthErrorMessage(new AuthError('bad token', 401, 'bad_jwt'))).toBe(
      'Your cloud session is no longer valid. Sign in again.',
    )
  })

  it('maps provider setup errors to Supabase configuration guidance', () => {
    expect(getFriendlyAuthErrorMessage(new AuthError('provider disabled', 400, 'provider_disabled'))).toBe(
      'Supabase sign-in is not configured correctly yet. Check enabled providers and redirect URLs.',
    )
  })
})
