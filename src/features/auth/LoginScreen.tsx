import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { AuthLoadingScreen } from './AuthLoadingScreen'
import { getFriendlyAuthErrorMessage } from './auth-errors'
import { useAuth } from './use-auth'

export function LoginScreen() {
  const { enabled, error, loading, signInWithGoogle, signInWithMagicLink, user } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState<'google' | 'email' | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  if (loading) return <AuthLoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />

  async function handleGoogleSignIn() {
    setSubmitting('google')
    setSubmitError(null)

    try {
      await signInWithGoogle()
    } catch (caught) {
      setSubmitError(getFriendlyAuthErrorMessage(caught))
      setSubmitting(null)
    }
  }

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextEmail = email.trim()
    if (!nextEmail) {
      setSubmitError('Enter an email address.')
      return
    }

    setSubmitting('email')
    setSubmitError(null)
    setMagicLinkSent(false)

    try {
      await signInWithMagicLink(nextEmail)
      setMagicLinkSent(true)
    } catch (caught) {
      setSubmitError(getFriendlyAuthErrorMessage(caught))
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="mk-auth-screen">
      <PanelCard className="mk-stack-lg mk-auth-panel">
        <ScreenHeader
          eyebrow="Welcome back"
          title="Sign in to Mom's Kitchen"
          description={
            enabled
              ? 'Use your real Supabase account to open the cloud-synced kitchen.'
              : 'Cloud sync must be configured before sign-in can work.'
          }
        />

        {!enabled && error ? (
          <EmptyState
            title="Cloud sync not configured"
            description={error}
          />
        ) : null}

        <button
          type="button"
          className="mk-button mk-button-primary mk-button-block"
          disabled={!enabled || submitting !== null}
          onClick={() => void handleGoogleSignIn()}
        >
          {submitting === 'google' ? 'Opening Google...' : 'Continue with Google'}
        </button>

        <form className="mk-stack-md" onSubmit={handleMagicLinkSubmit}>
          <label className="mk-field">
            Email
            <input
              className="mk-input"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setSubmitError(null)
                setMagicLinkSent(false)
              }}
              disabled={!enabled || submitting !== null}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>

          <button
            type="submit"
            className="mk-button mk-button-secondary mk-button-block"
            disabled={!enabled || !email.trim() || submitting !== null}
          >
            {submitting === 'email' ? 'Sending link...' : 'Email me a sign-in link'}
          </button>
        </form>

        {magicLinkSent ? (
          <p className="mk-auth-feedback">
            Check your email for the sign-in link, then return here after opening it.
          </p>
        ) : null}

        {submitError ? (
          <p className="mk-auth-feedback mk-auth-feedback-error" role="alert">
            {submitError}
          </p>
        ) : null}
      </PanelCard>
    </div>
  )
}
