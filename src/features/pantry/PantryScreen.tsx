import { ListCard } from '../../components/ui/ListCard'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { pantrySnapshot } from '../../data/placeholders'

export function PantryScreen() {
  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Pantry"
        title="Local-first pantry snapshot"
        description="Inventory and shopping flows will arrive later. For now, this route shows the new structure with placeholder inventory buckets."
      />

      <PanelCard className="mk-stack-md">
        <div className="mk-two-column-grid">
          <ListCard title="Staples" items={pantrySnapshot.staples} />
          <ListCard title="Low stock" items={pantrySnapshot.lowStock} />
        </div>
        <ListCard title="Restock soon" items={pantrySnapshot.restockSoon} />
      </PanelCard>
    </div>
  )
}
