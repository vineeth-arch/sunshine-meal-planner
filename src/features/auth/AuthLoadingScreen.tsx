import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

type AuthLoadingScreenProps = {
  title?: string
  description?: string
}

export function AuthLoadingScreen({
  title = 'Checking your kitchen access',
  description = 'Mom’s Kitchen is confirming your saved Supabase session before opening the app.',
}: AuthLoadingScreenProps) {
  return (
    <div className="mk-auth-screen">
      <PanelCard className="mk-stack-lg mk-auth-panel">
        <div className="mk-auth-loading-badge" aria-hidden="true" />
        <ScreenHeader
          eyebrow="Just a moment"
          title={title}
          description={description}
        />
      </PanelCard>
    </div>
  )
}
