import { ListCard } from '../../components/ui/ListCard'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { adminHighlights } from '../../data/placeholders'

export function AdminScreen() {
  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Admin"
        title="Migration guardrails"
        description="This route stays informational for now so the new foundation stays clean and avoids accidental backend coupling."
      />

      <PanelCard>
        <ListCard title="Phase-one notes" items={[...adminHighlights]} footer="No destructive migration behavior is enabled." />
      </PanelCard>
    </div>
  )
}
