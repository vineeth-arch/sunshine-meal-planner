import { ListCard } from '../../components/ui/ListCard'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { StatCard } from '../../components/ui/StatCard'
import { dashboardStats, pantrySnapshot, todaySummary, tomorrowSummary } from '../../data/placeholders'

export function DashboardScreen() {
  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Foundation refresh"
        title="A calmer home for meal planning"
        description="This dashboard uses placeholder data while the new React + Vite structure settles in."
      />

      <div className="mk-stat-grid">
        {dashboardStats.map((stat, index) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} tone={index === 0 ? 'accent' : 'default'} />
        ))}
      </div>

      <PanelCard className="mk-stack-md">
        <h3 className="mk-subtitle">This week at a glance</h3>
        <div className="mk-two-column-grid">
          <ListCard title="Today" items={todaySummary.lunch} footer="Lunch focus placeholder" />
          <ListCard title="Tomorrow" items={tomorrowSummary.dinner} footer="Dinner focus placeholder" />
        </div>
      </PanelCard>

      <PanelCard className="mk-stack-md">
        <h3 className="mk-subtitle">Pantry pulse</h3>
        <div className="mk-chip-row">
          {pantrySnapshot.lowStock.map((item) => (
            <span key={item} className="mk-chip mk-chip-soft">
              Restock {item}
            </span>
          ))}
        </div>
      </PanelCard>
    </div>
  )
}
