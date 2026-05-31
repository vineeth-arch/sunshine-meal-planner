import { DayPlannerView } from './DayPlannerView'
import { getTodayKey } from '../../lib/date/plans'

export function TodayScreen() {
  return (
    <DayPlannerView
      day={getTodayKey()}
      eyebrow="Today"
      title="Today's family menu"
      description="Plan breakfast, lunch, and dinner from the same local data used by the legacy app."
    />
  )
}
