import { EmptyState } from '../../components/ui/EmptyState'
import { ListCard } from '../../components/ui/ListCard'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { adminHighlights } from '../../data/placeholders'
import { getFirebaseConfigError, hasFirebaseConfig } from '../../lib/firebase'

export function AdminScreen() {
  const firebaseConfigError = getFirebaseConfigError()

  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Admin"
        title="Migration guardrails"
        description={
          hasFirebaseConfig()
            ? 'Firebase services are configured, but cloud sync remains intentionally manual and isolated from the local-first kitchen flow.'
            : 'Cloud sync is not configured yet. This route documents the Firebase setup needed before any auth or Firestore rollout.'
        }
      />

      {firebaseConfigError ? (
        <PanelCard>
          <EmptyState
            title="Cloud setup is incomplete"
            description={firebaseConfigError}
          />
        </PanelCard>
      ) : null}

      <PanelCard>
        <ListCard title="Phase-one notes" items={[...adminHighlights]} footer="No destructive migration behavior is enabled." />
      </PanelCard>
    </div>
  )
}
