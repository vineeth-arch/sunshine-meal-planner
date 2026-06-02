import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

type AuthProfileErrorScreenProps = {
  error: string
  onRetry(): Promise<void>
  onSignOut(): Promise<void>
}

export function AuthProfileErrorScreen({ error, onRetry, onSignOut }: AuthProfileErrorScreenProps) {
  return (
    <div className="mk-auth-screen">
      <PanelCard className="mk-stack-lg mk-auth-panel">
        <ScreenHeader
          eyebrow="Profile error"
          title="We couldn't load this Mom's Kitchen profile"
          description="The Supabase account is valid, but the profile row is missing required data or couldn't be read."
        />
        <EmptyState title="Profile access failed" description={error} />
        <div className="mk-inline-actions">
          <button type="button" className="mk-button mk-button-primary mk-button-pad" onClick={() => void onRetry()}>
            Retry
          </button>
          <button type="button" className="mk-button mk-button-secondary mk-button-pad" onClick={() => void onSignOut()}>
            Sign out
          </button>
        </div>
      </PanelCard>
    </div>
  )
}
