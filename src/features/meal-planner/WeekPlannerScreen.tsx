import { useMemo, useState } from 'react'

import { useLocalKitchen } from '../../app/local-kitchen-context'
import { DayPlannerView, WeekDayPicker } from './DayPlannerView'
import { DAY_FULL, DAYS, getTodayKey } from '../../lib/date/plans'
import type { DayKey } from '../../types/domain'

function summarize(ids: string[], getDishName: (id: string) => string) {
  if (ids.length === 0) return 'Nothing planned yet'
  return ids.map(getDishName).join(', ')
}

export function WeekPlannerScreen() {
  const { state, getDishById, getIngredientsNeeded } = useLocalKitchen()
  const [selectedDay, setSelectedDay] = useState<DayKey>(getTodayKey())
  const [showWeekIngredients, setShowWeekIngredients] = useState(false)

  const getDishName = useMemo(
    () => (id: string) => getDishById(id)?.name ?? 'Unknown dish',
    [getDishById],
  )
  const weekIngredients = getIngredientsNeeded('week')

  return (
    <div className="mk-stack-lg">
      <div className="mk-stack-sm">
        <p className="mk-eyebrow">Week planner</p>
        <h2 className="mk-section-title">Weekly meal planner</h2>
        <p className="mk-copy">Review the whole week, then drill into any day to keep the shared cloud plan aligned.</p>
        <div className="mk-inline-actions">
          <button
            type="button"
            className="mk-button mk-button-primary mk-button-pad-sm"
            onClick={() => setShowWeekIngredients(true)}
          >
            Whole-week ingredients
          </button>
        </div>
      </div>

      <div className="mk-week-list">
        {DAYS.map((day) => {
          const plan = state.plan.days[day]
          return (
            <button key={day} type="button" className="mk-day-row mk-day-row-button" onClick={() => setSelectedDay(day)}>
              <div className="mk-inline-title">
                <h3 className="mk-subtitle">{DAY_FULL[day]}</h3>
                <span className="mk-meta">{selectedDay === day ? 'Editing below' : 'Tap to edit'}</span>
              </div>
              <div className="mk-day-summary">
                <span>Breakfast: {summarize(plan.breakfast.sabjis, getDishName)}</span>
                <span>Lunch: {summarize([plan.lunch.curry, plan.lunch.sabji, plan.lunch.gujaratiSabji].filter(Boolean), getDishName)}</span>
                <span>Dinner: {summarize([plan.dinner.curry, ...plan.dinner.sabjis, plan.dinner.gujaratiSabji].filter(Boolean), getDishName)}</span>
              </div>
            </button>
          )
        })}
      </div>

      <WeekDayPicker selectedDay={selectedDay} onSelect={setSelectedDay} />

      <DayPlannerView
        day={selectedDay}
        eyebrow="Week detail"
        title={`${DAY_FULL[selectedDay]} detail`}
        description="Edit the selected day without leaving the weekly planning route."
      />

      {showWeekIngredients ? (
        <div className="mk-modal-backdrop" role="presentation">
          <div className="mk-modal-card" role="dialog" aria-modal="true" aria-label="Whole-week ingredients">
            <div className="mk-inline-title">
              <h3 className="mk-subtitle">Whole-week ingredients</h3>
              <button
                type="button"
                className="mk-button mk-button-secondary mk-button-pad-xs"
                onClick={() => setShowWeekIngredients(false)}
              >
                Close
              </button>
            </div>
            <ul className="mk-list">
              {Object.entries(weekIngredients.total).length === 0 ? (
                <li>Nothing needed yet.</li>
              ) : (
                Object.entries(weekIngredients.total).map(([name, count]) => (
                  <li key={name}>
                    {name} x{count}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
