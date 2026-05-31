import { DayPlannerView } from './DayPlannerView'
import { getTodayKey, getTomorrowKey } from '../../lib/date/plans'
import { useLocalKitchen } from '../../app/local-kitchen-context'
import { canEdit } from '../auth/access'
import { useAuth } from '../auth/use-auth'

export function TomorrowScreen() {
  const { copyDay, clearDay } = useLocalKitchen()
  const { profile } = useAuth()
  const allowEdit = canEdit(profile)

  return (
    <DayPlannerView
      day={getTomorrowKey()}
      eyebrow="Tomorrow"
      title="Tomorrow's family menu"
      description="Reuse today when it helps, then adjust individual slots for the next day."
      extraActions={allowEdit ? (
        <>
          <button
            type="button"
            className="mk-button mk-button-primary mk-button-pad"
            onClick={() => void copyDay(getTodayKey(), getTomorrowKey())}
          >
            Copy today
          </button>
          <button
            type="button"
            className="mk-button mk-button-secondary mk-button-pad"
            onClick={() => void clearDay(getTomorrowKey())}
          >
            Clear tomorrow
          </button>
        </>
      ) : null}
    />
  )
}
