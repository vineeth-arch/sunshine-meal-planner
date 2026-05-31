import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

export function SettingsScreen() {
  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Settings"
        title="Settings are intentionally shallow in phase one"
        description="We are preserving migration safety, so this phase avoids rewriting integrations, auth toggles, and persistence controls."
      />

      <PanelCard>
        <EmptyState
          title="Future settings modules"
          description="Profile preferences, integrations, sync options, and household configuration will layer onto this route after the core screen migration is stable."
        />
      </PanelCard>
    </div>
  )
}
