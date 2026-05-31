import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

type AuthSetupRequiredScreenProps = {
  email?: string | null
  onSignOut(): Promise<void>
}

export function AuthSetupRequiredScreen({ email, onSignOut }: AuthSetupRequiredScreenProps) {
  return (
    <div className="mk-auth-screen">
      <PanelCard className="mk-stack-lg mk-auth-panel">
        <ScreenHeader
          eyebrow="Setup required"
          title="This account still needs a Firestore profile"
          description={`Signed in${email ? ` as ${email}` : ''}, but no users/{uid} document was found. Create the Firestore profile for this account, then sign in again.`}
        />
        <div className="mk-inline-actions">
          <button type="button" className="mk-button mk-button-secondary mk-button-pad" onClick={() => void onSignOut()}>
            Sign out
          </button>
        </div>
      </PanelCard>
    </div>
  )
}
