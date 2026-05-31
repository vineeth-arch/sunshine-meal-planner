import { useMemo } from 'react'

import { useLocalKitchen } from '../../app/local-kitchen-context'
import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { StatCard } from '../../components/ui/StatCard'
import { getTodayKey, getTomorrowKey } from '../../lib/date/plans'

function summarize(items: string[]) {
  return items.length > 0 ? items.join(', ') : 'Nothing planned yet'
}

export function DashboardScreen() {
  const { state, getDishById, loading, error, refreshData } = useLocalKitchen()
  const today = state.plan.days[getTodayKey()]
  const tomorrow = state.plan.days[getTomorrowKey()]

  const stats = useMemo(() => [
    { label: 'Dishes', value: String(state.repo.length) },
    { label: 'Ingredients', value: String(state.ingredients.length) },
    { label: 'Staples', value: String(state.staples.length) },
    { label: 'Pantry items', value: String(state.pantry.length) },
  ], [state.ingredients.length, state.pantry.length, state.repo.length, state.staples.length])

  const todayMeals = [
    ...today.breakfast.sabjis,
    today.lunch.curry,
    today.lunch.sabji,
    today.lunch.gujaratiSabji,
    today.dinner.curry,
    ...today.dinner.sabjis,
    today.dinner.gujaratiSabji,
  ].filter(Boolean).map((id) => getDishById(id)?.name ?? 'Unknown dish')

  const tomorrowMeals = [
    ...tomorrow.breakfast.sabjis,
    tomorrow.lunch.curry,
    tomorrow.lunch.sabji,
    tomorrow.lunch.gujaratiSabji,
    tomorrow.dinner.curry,
    ...tomorrow.dinner.sabjis,
    tomorrow.dinner.gujaratiSabji,
  ].filter(Boolean).map((id) => getDishById(id)?.name ?? 'Unknown dish')

  const lowStock = state.pantry.filter((item) => item.status === 'low' || item.status === 'out').map((item) => item.name)

  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Household dashboard"
        title="A calmer home for meal planning"
        description="This summary now reflects the signed-in household's Firestore data."
      />

      {error ? (
        <PanelCard className="mk-stack-sm">
          <EmptyState title="Could not load dashboard" description={error} />
          <button type="button" className="mk-button mk-button-secondary mk-button-pad-sm" onClick={() => void refreshData()}>
            Retry
          </button>
        </PanelCard>
      ) : null}

      {loading ? (
        <PanelCard>
          <p className="mk-meta">Loading household summary...</p>
        </PanelCard>
      ) : null}

      <div className="mk-stat-grid">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} tone={index === 0 ? 'accent' : 'default'} />
        ))}
      </div>

      <PanelCard className="mk-stack-md">
        <h3 className="mk-subtitle">This week at a glance</h3>
        <div className="mk-two-column-grid">
          <div className="mk-subpanel mk-stack-xs">
            <strong>Today</strong>
            <p className="mk-meta">{summarize(todayMeals)}</p>
          </div>
          <div className="mk-subpanel mk-stack-xs">
            <strong>Tomorrow</strong>
            <p className="mk-meta">{summarize(tomorrowMeals)}</p>
          </div>
        </div>
      </PanelCard>

      <PanelCard className="mk-stack-md">
        <h3 className="mk-subtitle">Pantry pulse</h3>
        {lowStock.length === 0 ? (
          <p className="mk-meta">Nothing marked low or out right now.</p>
        ) : (
          <div className="mk-chip-row">
            {lowStock.map((item) => (
              <span key={item} className="mk-chip mk-chip-soft">
                Restock {item}
              </span>
            ))}
          </div>
        )}
      </PanelCard>
    </div>
  )
}
