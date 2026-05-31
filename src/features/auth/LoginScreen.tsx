import { Link } from 'react-router-dom'

import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

export function LoginScreen() {
  return (
    <div className="mk-auth-screen">
      <PanelCard className="mk-stack-lg">
        <ScreenHeader
          eyebrow="Phase one"
          title="Login is a placeholder for now"
          description="Authentication is intentionally inactive in this foundation pass. This route exists so the future auth flow has a stable home."
        />
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
            Enter placeholder app
          </Link>
        </div>
      </PanelCard>
    </div>
  )
}
