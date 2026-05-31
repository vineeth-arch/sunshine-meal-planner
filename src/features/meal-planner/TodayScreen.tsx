import { ListCard } from '../../components/ui/ListCard'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { todaySummary } from '../../data/placeholders'

export function TodayScreen() {
  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Today"
        title="Today's family menu"
        description="Placeholder meal slots make the new route structure visible without touching the legacy planning logic yet."
      />

      <PanelCard className="mk-three-column-stack">
        <ListCard title="Breakfast" items={todaySummary.breakfast} />
        <ListCard title="Lunch" items={todaySummary.lunch} />
        <ListCard title="Dinner" items={todaySummary.dinner} />
      </PanelCard>
    </div>
  )
}
