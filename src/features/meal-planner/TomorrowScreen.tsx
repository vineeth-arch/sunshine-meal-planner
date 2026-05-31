import { DayPlannerView } from './DayPlannerView'
import { getTodayKey, getTomorrowKey } from '../../lib/date/plans'
import { useLocalKitchen } from '../../app/local-kitchen-context'

export function TomorrowScreen() {
  const { copyDay, clearDay } = useLocalKitchen()

  return (
    <DayPlannerView
      day={getTomorrowKey()}
      eyebrow="Tomorrow"
      title="Tomorrow's family menu"
      description="Reuse today when it helps, then adjust individual slots for the next day."
      extraActions={
        <>
          <button
            type="button"
            className="mk-button mk-button-primary mk-button-pad"
            onClick={() => copyDay(getTodayKey(), getTomorrowKey())}
          >
            Copy today
          </button>
          <button
            type="button"
            className="mk-button mk-button-secondary mk-button-pad"
            onClick={() => clearDay(getTomorrowKey())}
          >
            Clear tomorrow
          </button>
        </>
      }
    />
  )
}
