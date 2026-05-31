import { useMemo, useState, type ReactNode } from 'react'

import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { DAYS, DAY_FULL } from '../../lib/date/plans'
import { useLocalKitchen } from '../../app/local-kitchen-context'
import type { DayKey, DayPlan, Dish, DishCategory } from '../../types/domain'
import { LocalImageThumb } from '../../components/kitchen/LocalImageThumb'

type PickerState = {
  meal: 'breakfast' | 'lunch' | 'dinner'
  field: 'sabjis' | 'curry' | 'sabji' | 'gujaratiSabji'
  label: string
  allowsMultiple: boolean
  category: DishCategory
}

type DayPlannerViewProps = {
  day: DayKey
  eyebrow: string
  title: string
  description: string
  extraActions?: ReactNode
}

const SLOT_CONFIGS: PickerState[] = [
  { meal: 'breakfast', field: 'sabjis', label: 'Breakfast', allowsMultiple: true, category: 'sabji' },
  { meal: 'lunch', field: 'curry', label: 'Lunch curry', allowsMultiple: false, category: 'curry' },
  { meal: 'lunch', field: 'sabji', label: 'Lunch sabji', allowsMultiple: false, category: 'sabji' },
  { meal: 'lunch', field: 'gujaratiSabji', label: 'Lunch Gujarati', allowsMultiple: false, category: 'gujarati' },
  { meal: 'dinner', field: 'curry', label: 'Dinner curry', allowsMultiple: false, category: 'curry' },
  { meal: 'dinner', field: 'sabjis', label: 'Dinner sabjis', allowsMultiple: true, category: 'sabji' },
  { meal: 'dinner', field: 'gujaratiSabji', label: 'Dinner Gujarati', allowsMultiple: false, category: 'gujarati' },
]

function getSlotIds(dayPlan: DayPlan, picker: PickerState) {
  if (picker.meal === 'breakfast') return dayPlan.breakfast.sabjis
  if (picker.meal === 'lunch' && picker.field === 'curry') return dayPlan.lunch.curry ? [dayPlan.lunch.curry] : []
  if (picker.meal === 'lunch' && picker.field === 'sabji') return dayPlan.lunch.sabji ? [dayPlan.lunch.sabji] : []
  if (picker.meal === 'lunch' && picker.field === 'gujaratiSabji') {
    return dayPlan.lunch.gujaratiSabji ? [dayPlan.lunch.gujaratiSabji] : []
  }
  if (picker.meal === 'dinner' && picker.field === 'curry') return dayPlan.dinner.curry ? [dayPlan.dinner.curry] : []
  if (picker.meal === 'dinner' && picker.field === 'sabjis') return dayPlan.dinner.sabjis
  return dayPlan.dinner.gujaratiSabji ? [dayPlan.dinner.gujaratiSabji] : []
}

function IngredientsCount({ items }: { items: Record<string, number> }) {
  const entries = Object.entries(items)
  if (entries.length === 0) return <p className="mk-meta">Nothing needed yet.</p>

  return (
    <ul className="mk-list">
      {entries.map(([name, count]) => (
        <li key={name}>
          {name} x{count}
        </li>
      ))}
    </ul>
  )
}

export function DayPlannerView({ day, eyebrow, title, description, extraActions }: DayPlannerViewProps) {
  const {
    state,
    updateSlot,
    clearSlot,
    getDishById,
    getIngredientsNeeded,
    getOverlappingDishes,
    loading,
    error,
    refreshData,
    syncMessage,
    canEditData,
  } = useLocalKitchen()
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [ideasForDishId, setIdeasForDishId] = useState<string | null>(null)
  const [showIngredientsNeeded, setShowIngredientsNeeded] = useState(false)
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])

  const dayPlan = state.plan.days[day]
  const ingredientUniverse = useMemo(() => {
    const names = new Set<string>()
    state.repo.forEach((dish) => {
      dish.mainIngredients.forEach((ingredient) => {
        if (!state.staples.includes(ingredient.toLowerCase())) names.add(ingredient)
      })
    })
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [state.repo, state.staples])

  const ingredientsNeeded = getIngredientsNeeded(day)
  const overlapping = ideasForDishId ? getOverlappingDishes(ideasForDishId) : []
  const allowEdit = canEditData

  return (
    <div className="mk-stack-lg">
      <ScreenHeader eyebrow={eyebrow} title={title} description={description} />

      {syncMessage ? (
        <PanelCard>
          <p className="mk-meta">{syncMessage}</p>
        </PanelCard>
      ) : null}

      {error ? (
        <PanelCard className="mk-stack-sm">
          <EmptyState title="Could not load meal plan" description={error} />
          <button type="button" className="mk-button mk-button-secondary mk-button-pad-sm" onClick={() => void refreshData()}>
            Retry
          </button>
        </PanelCard>
      ) : null}

      {loading ? (
        <PanelCard>
          <p className="mk-meta">Loading this week's Firestore plan...</p>
        </PanelCard>
      ) : null}

      <PanelCard className="mk-stack-sm">
        <div className="mk-inline-actions">
          <button type="button" className="mk-button mk-button-primary mk-button-pad" onClick={() => setShowIngredientsNeeded(true)}>
            Ingredients needed
          </button>
          {allowEdit ? extraActions : null}
        </div>
        {!allowEdit ? <p className="mk-meta">Viewer access is read-only. Meal plan changes are disabled.</p> : null}
      </PanelCard>

      {SLOT_CONFIGS.map((slot) => {
        const dishIds = getSlotIds(dayPlan, slot)
        return (
          <PanelCard key={`${slot.meal}-${slot.field}`} className="mk-stack-sm">
            <div className="mk-inline-title">
              <div>
                <p className="mk-eyebrow">{slot.meal}</p>
                <h3 className="mk-subtitle">{slot.label}</h3>
              </div>
              <div className="mk-inline-actions">
                {allowEdit ? (
                  <>
                    <button type="button" className="mk-button mk-button-primary mk-button-pad-sm" onClick={() => setPicker(slot)}>
                      Pick
                    </button>
                    <button
                      type="button"
                      className="mk-button mk-button-secondary mk-button-pad-sm"
                      onClick={() => void clearSlot(day, slot.meal, slot.field)}
                    >
                      Clear
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {dishIds.length === 0 ? (
              <p className="mk-meta">No dish selected yet.</p>
            ) : (
              <div className="mk-stack-sm">
                {dishIds.map((dishId) => {
                  const dish = getDishById(dishId)
                  if (!dish) return null

                  return (
                    <div key={dish.id} className="mk-entity-row">
                      <LocalImageThumb
                        kind="dish"
                        id={dish.id}
                        hostedUrl={dish.image}
                        emoji={dish.emoji}
                        alt={dish.name}
                        className="mk-thumb"
                      />
                      <div className="mk-stack-xs">
                        <strong>{dish.name}</strong>
                        <span className="mk-meta">{dish.mainIngredients.join(', ') || 'No ingredients listed.'}</span>
                      </div>
                      <button
                        type="button"
                        className="mk-button mk-button-secondary mk-button-pad-xs"
                        onClick={() => setIdeasForDishId(dish.id)}
                      >
                        Ideas
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </PanelCard>
        )
      })}

      {picker ? (
        <DishPickerModal
          dayLabel={DAY_FULL[day]}
          picker={picker}
          selectedIds={getSlotIds(dayPlan, picker)}
          ingredients={ingredientUniverse}
          onClose={() => {
            setPicker(null)
            setSelectedIngredients([])
          }}
          onSave={(dishIds) => {
            void updateSlot(day, picker.meal, picker.field, picker.allowsMultiple ? dishIds : dishIds[0] ?? '')
            setPicker(null)
            setSelectedIngredients([])
          }}
          selectedIngredients={selectedIngredients}
          setSelectedIngredients={setSelectedIngredients}
        />
      ) : null}

      {showIngredientsNeeded ? (
        <ModalCard title={`${DAY_FULL[day]} ingredients needed`} onClose={() => setShowIngredientsNeeded(false)}>
          <div className="mk-stack-sm">
            <section>
              <h4 className="mk-subtitle">Breakfast</h4>
              <IngredientsCount items={ingredientsNeeded.breakfast} />
            </section>
            <section>
              <h4 className="mk-subtitle">Lunch</h4>
              <IngredientsCount items={ingredientsNeeded.lunch} />
            </section>
            <section>
              <h4 className="mk-subtitle">Dinner</h4>
              <IngredientsCount items={ingredientsNeeded.dinner} />
            </section>
            <section>
              <h4 className="mk-subtitle">Total</h4>
              <IngredientsCount items={ingredientsNeeded.total} />
            </section>
          </div>
        </ModalCard>
      ) : null}

      {ideasForDishId ? (
        <ModalCard
          title={`Alternative dishes for ${getDishById(ideasForDishId)?.name ?? 'this dish'}`}
          onClose={() => setIdeasForDishId(null)}
        >
          <div className="mk-stack-sm">
            {overlapping.length === 0 ? (
              <p className="mk-meta">No close alternatives found yet.</p>
            ) : (
              overlapping.map(({ dish, overlap }) => (
                <div key={dish.id} className="mk-subpanel mk-stack-xs">
                  <strong>{dish.name}</strong>
                  <span className="mk-meta">Shared ingredients: {overlap.join(', ')}</span>
                </div>
              ))
            )}
          </div>
        </ModalCard>
      ) : null}
    </div>
  )
}

function DishPickerModal({
  dayLabel,
  picker,
  selectedIds,
  ingredients,
  onClose,
  onSave,
  selectedIngredients,
  setSelectedIngredients,
}: {
  dayLabel: string
  picker: PickerState
  selectedIds: string[]
  ingredients: string[]
  onClose(): void
  onSave(ids: string[]): void
  selectedIngredients: string[]
  setSelectedIngredients(next: string[]): void
}) {
  const { state, suggestFromIngredients } = useLocalKitchen()
  const [nextIds, setNextIds] = useState<string[]>(selectedIds)
  const [filter, setFilter] = useState<'all' | DishCategory>('all')
  const dishPool = useMemo(() => {
    const base = selectedIngredients.length > 0 ? suggestFromIngredients(selectedIngredients) : state.repo
    return base.filter((dish) => dish.category === picker.category && (filter === 'all' || dish.category === filter))
  }, [filter, picker.category, selectedIngredients, state.repo, suggestFromIngredients])

  function toggleDish(dish: Dish) {
    if (!picker.allowsMultiple) {
      setNextIds([dish.id])
      return
    }

    setNextIds((current) =>
      current.includes(dish.id) ? current.filter((item) => item !== dish.id) : [...current, dish.id].slice(-2),
    )
  }

  return (
    <ModalCard title={`${dayLabel}: ${picker.label}`} onClose={onClose}>
      <div className="mk-stack-sm">
        <div className="mk-chip-row">
          {(['all', picker.category] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`mk-chip ${filter === value ? 'mk-chip-strong' : 'mk-chip-soft'}`}
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="mk-subpanel mk-stack-xs">
          <p className="mk-meta">Filter by ingredients</p>
          <div className="mk-check-grid">
            {ingredients.map((ingredient) => {
              const checked = selectedIngredients.includes(ingredient)
              return (
                <label key={ingredient} className="mk-check-card">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setSelectedIngredients(
                        event.target.checked
                          ? [...selectedIngredients, ingredient]
                          : selectedIngredients.filter((item) => item !== ingredient),
                      )
                    }
                  />
                  <span>{ingredient}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="mk-stack-sm mk-scroll-panel">
          {dishPool.length === 0 ? (
            <p className="mk-meta">No exact matches. Try checking more ingredients.</p>
          ) : (
            dishPool.map((dish) => {
              const active = nextIds.includes(dish.id)
              return (
                <button
                  key={dish.id}
                  type="button"
                  className={`mk-select-row${active ? ' mk-select-row-active' : ''}`}
                  onClick={() => toggleDish(dish)}
                >
                  <LocalImageThumb
                    kind="dish"
                    id={dish.id}
                    hostedUrl={dish.image}
                    emoji={dish.emoji}
                    alt={dish.name}
                    className="mk-thumb"
                  />
                  <div className="mk-stack-xs">
                    <strong>{dish.name}</strong>
                    <span className="mk-meta">{dish.mainIngredients.join(', ')}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
        <div className="mk-inline-actions">
          <button type="button" className="mk-button mk-button-secondary mk-button-pad" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="mk-button mk-button-primary mk-button-pad" onClick={() => onSave(nextIds)}>
            Save selection
          </button>
        </div>
      </div>
    </ModalCard>
  )
}

function ModalCard({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose(): void
}) {
  return (
    <div className="mk-modal-backdrop" role="presentation">
      <div className="mk-modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mk-inline-title">
          <h3 className="mk-subtitle">{title}</h3>
          <button type="button" className="mk-button mk-button-secondary mk-button-pad-xs" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function WeekDayPicker({
  selectedDay,
  onSelect,
}: {
  selectedDay: DayKey
  onSelect(day: DayKey): void
}) {
  return (
    <div className="mk-chip-row">
      {DAYS.map((day) => (
        <button
          key={day}
          type="button"
          className={`mk-chip ${selectedDay === day ? 'mk-chip-strong' : 'mk-chip-soft'}`}
          onClick={() => onSelect(day)}
        >
          {DAY_FULL[day]}
        </button>
      ))}
    </div>
  )
}
