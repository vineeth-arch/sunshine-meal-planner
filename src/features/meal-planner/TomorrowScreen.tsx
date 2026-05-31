import { ListCard } from '../../components/ui/ListCard'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { tomorrowSummary } from '../../data/placeholders'

export function TomorrowScreen() {
  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Tomorrow"
        title="Tomorrow's prep view"
        description="This screen is intentionally lightweight so we can migrate real planning interactions in a later phase."
      />

      <PanelCard className="mk-three-column-stack">
        <ListCard title="Breakfast" items={tomorrowSummary.breakfast} />
        <ListCard title="Lunch" items={tomorrowSummary.lunch} />
        <ListCard title="Dinner" items={tomorrowSummary.dinner} />
      </PanelCard>
    </div>
  )
}
