import { Link } from 'react-router-dom'

import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { getFirebaseConfigError, hasFirebaseConfig } from '../../lib/firebase'

export function LoginScreen() {
  const firebaseConfigError = getFirebaseConfigError()

  return (
    <div className="mk-auth-screen">
      <PanelCard className="mk-stack-lg">
        <ScreenHeader
          eyebrow="Phase one"
          title="Login is a placeholder for now"
          description={
            hasFirebaseConfig()
              ? 'Firebase Auth is wired for future work, but the real sign-in flow is intentionally inactive in this foundation pass.'
              : 'Firebase Auth is not configured yet. This route stays safe to open and shows what needs to be set before auth work begins.'
          }
        />
        {firebaseConfigError ? (
          <EmptyState
            title="Firebase configuration needed"
            description={firebaseConfigError}
          />
        ) : null}
        <div className="mk-stack-sm">
          <label className="mk-field">
            <span>Email</span>
            <input className="mk-input" type="email" placeholder="family@example.com" disabled />
          </label>
          <label className="mk-field">
            <span>Password</span>
            <input className="mk-input" type="password" placeholder="••••••••" disabled />
          </label>
        </div>
        <div className="mk-inline-actions">
          <Link to="/dashboard" className="mk-button mk-button-primary">
            Continue to local app
          </Link>
        </div>
      </PanelCard>
    </div>
  )
}
