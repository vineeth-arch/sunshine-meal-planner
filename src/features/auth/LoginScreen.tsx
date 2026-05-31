import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import type { ProfileKey } from '../../types/domain'
import { AuthLoadingScreen } from './AuthLoadingScreen'
import { getFriendlyAuthErrorMessage } from './auth-errors'
import { PROFILE_OPTIONS, getProfileOption } from './profile-options'
import { useAuth } from './use-auth'

export function LoginScreen() {
  const { enabled, error, loading, signIn, user } = useAuth()
  const [selectedProfile, setSelectedProfile] = useState<ProfileKey | null>(null)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const activeProfile = getProfileOption(selectedProfile)

  if (loading) return <AuthLoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!activeProfile) {
      setSubmitError('Choose a profile before entering a password.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      await signIn(activeProfile.email, password)
    } catch (caught) {
      setSubmitError(getFriendlyAuthErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mk-auth-screen">
      <PanelCard className="mk-stack-lg mk-auth-panel">
        <ScreenHeader
          eyebrow="Welcome back"
          title="Choose your kitchen profile"
          description={
            enabled
              ? 'Pick a household profile first, then enter that profile’s Firebase password to unlock Mom’s Kitchen.'
              : 'Firebase Auth needs to be configured before anyone can enter the kitchen app. Once the project is ready, create the profile accounts in Firebase Console and sign in here.'
          }
        />

        {!enabled && error ? (
          <EmptyState
            title="Firebase configuration needed"
            description={error}
          />
        ) : null}

        <div className="mk-profile-grid" role="list" aria-label="Kitchen profiles">
          {PROFILE_OPTIONS.map((option) => {
            const isSelected = option.key === selectedProfile

            return (
              <button
                key={option.key}
                type="button"
                className={`mk-profile-card${isSelected ? ' mk-profile-card-selected' : ''}`}
                onClick={() => {
                  setSelectedProfile(option.key)
                  setPassword('')
                  setSubmitError(null)
                }}
                aria-pressed={isSelected}
                disabled={!enabled || submitting}
              >
                <span className="mk-profile-badge">{option.badge}</span>
                <span className="mk-subtitle">{option.label}</span>
                <span className="mk-copy">{option.description}</span>
              </button>
            )
          })}
        </div>

        <form className="mk-stack-md" onSubmit={handleSubmit}>
          <label className="mk-field">
            <span>Password</span>
            <input
              className="mk-input"
              type="password"
              placeholder={activeProfile ? `Enter ${activeProfile.label}'s password` : 'Choose a profile first'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (submitError) setSubmitError(null)
              }}
              disabled={!enabled || !activeProfile || submitting}
              autoComplete="current-password"
            />
          </label>

          {activeProfile ? <p className="mk-meta">{activeProfile.helper}</p> : null}

          <p className="mk-meta">
            First-time setup reminder: each profile account must exist in Firebase Authentication and have a matching users/{'{'}uid{'}'} Firestore profile document before anyone can open the app.
          </p>

          {submitError ? (
            <p className="mk-auth-feedback mk-auth-feedback-error" role="alert">
              {submitError}
            </p>
          ) : null}

          {!enabled ? (
            <p className="mk-auth-feedback">
              Firebase Authentication must be configured and the four profile accounts must be created in Firebase Console before login can work.
            </p>
          ) : null}

          <div className="mk-inline-actions">
            <button
              type="submit"
              className="mk-button mk-button-primary mk-button-block"
              disabled={!enabled || !activeProfile || !password.trim() || submitting}
            >
              {submitting ? 'Signing in…' : activeProfile ? `Continue as ${activeProfile.label}` : 'Choose a profile'}
            </button>
          </div>
        </form>
      </PanelCard>
    </div>
  )
}
