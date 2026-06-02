import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { useAuth } from './use-auth'

export function AuthAdminDeniedScreen() {
  const { profile, signOutUser } = useAuth()

  return (
    <div className="mk-auth-screen">
      <PanelCard className="mk-stack-lg mk-auth-panel">
        <ScreenHeader
          eyebrow="Access denied"
          title="This admin dashboard is locked"
          description="Only admin or platform superadmin accounts can open household controls, backup tools, and role label settings."
        />
        <EmptyState
          title="Your account is not an admin"
          description={`Signed in as ${profile?.displayName ?? 'this profile'} with ${profile?.role ?? 'unknown'} access.`}
        />
        <div className="mk-inline-actions">
          <button type="button" className="mk-button mk-button-secondary mk-button-pad" onClick={() => void signOutUser()}>
            Sign out
          </button>
        </div>
      </PanelCard>
    </div>
  )
}
