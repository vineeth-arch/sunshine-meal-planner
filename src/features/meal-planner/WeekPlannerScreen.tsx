import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { weekPlannerDays } from '../../data/placeholders'

export function WeekPlannerScreen() {
  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Week planner"
        title="Weekly structure before feature migration"
        description="A route-level planner summary keeps the information architecture in place while data entry stays on hold."
      />

      <PanelCard className="mk-stack-md">
        <div className="mk-week-list">
          {weekPlannerDays.map((day) => (
            <article key={day.day} className="mk-day-row">
              <div>
                <h3 className="mk-subtitle">{day.day}</h3>
                <p className="mk-meta">{day.breakfast}</p>
              </div>
              <div className="mk-day-summary">
                <span>{day.lunch}</span>
                <span>{day.dinner}</span>
              </div>
            </article>
          ))}
        </div>
      </PanelCard>
    </div>
  )
}
