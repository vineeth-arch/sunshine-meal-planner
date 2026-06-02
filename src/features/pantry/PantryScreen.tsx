import { useMemo, useState } from 'react'

import { useLocalKitchen } from '../../app/local-kitchen-context'
import { LocalImageThumb } from '../../components/kitchen/LocalImageThumb'
import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

export function PantryScreen() {
  const {
    state,
    runFridgePlan,
    suggestFromIngredients,
    updatePantryItem,
    loading,
    error,
    refreshData,
    syncMessage,
    canEditData,
  } = useLocalKitchen()
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [includeGujarati, setIncludeGujarati] = useState(true)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const allowEdit = canEditData

  const makeable = useMemo(
    () => suggestFromIngredients(selectedIngredients).filter((dish) => includeGujarati || dish.category !== 'gujarati'),
    [includeGujarati, selectedIngredients, suggestFromIngredients],
  )
  const pantryIngredients = state.pantry.filter((item) => item.kind === 'ingredient')
  const pantryRecords = state.pantry

  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Pantry"
        title="Shared pantry"
        description="Pantry inventory, ingredient suggestions, and fridge planning read from household cloud data."
      />

      {syncMessage ? (
        <PanelCard>
          <p className="mk-meta">{syncMessage}</p>
        </PanelCard>
      ) : null}

      {error ? (
        <PanelCard className="mk-stack-sm">
          <EmptyState title="Could not load pantry" description={error} />
          <button type="button" className="mk-button mk-button-secondary mk-button-pad-sm" onClick={() => void refreshData()}>
            Retry
          </button>
        </PanelCard>
      ) : null}

      {loading ? (
        <PanelCard>
          <p className="mk-meta">Loading pantry from Supabase...</p>
        </PanelCard>
      ) : null}

      <PanelCard className="mk-stack-sm">
        <div className="mk-inline-title">
          <h3 className="mk-subtitle">Plan from fridge</h3>
          <button
            type="button"
            className="mk-button mk-button-primary mk-button-pad-sm"
            disabled={!allowEdit}
            onClick={() => {
              void runFridgePlan(selectedIngredients, includeGujarati).then((result) => {
                setResultMessage(
                  result.makeableCount === 0
                    ? 'Nothing makeable with those ingredients yet.'
                    : `Filled ${result.filledCount} slots from ${result.makeableCount} makeable dishes.`,
                )
              })
            }}
          >
            Generate plan
          </button>
        </div>
        {!allowEdit ? <p className="mk-meta">Member access is read-only. Pantry suggestions still work, but plan generation is disabled.</p> : null}

        <label className="mk-check-card">
          <input type="checkbox" checked={includeGujarati} onChange={(event) => setIncludeGujarati(event.target.checked)} />
          <span>Include Gujarati dishes</span>
        </label>

        <div className="mk-check-grid">
          {pantryIngredients.map((ingredient) => {
            const checked = selectedIngredients.includes(ingredient.name)
            return (
              <label key={ingredient.id} className="mk-check-card">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    setSelectedIngredients(
                      event.target.checked
                        ? [...selectedIngredients, ingredient.name]
                        : selectedIngredients.filter((item) => item !== ingredient.name),
                    )
                  }
                />
                <span>{ingredient.name}</span>
              </label>
            )
          })}
        </div>

        {resultMessage ? <p className="mk-meta">{resultMessage}</p> : null}
      </PanelCard>

      <PanelCard className="mk-stack-sm">
        <h3 className="mk-subtitle">Pantry records</h3>
        {pantryRecords.length === 0 ? (
          <EmptyState title="No pantry items yet" description="Add ingredients or run the admin migration to seed pantry records." />
        ) : (
          <div className="mk-stack-sm">
            {pantryRecords.map((item) => (
              <div key={item.id} className="mk-subpanel mk-stack-sm">
                <div className="mk-entity-row">
                  <LocalImageThumb
                    kind={item.kind === 'staple' ? 'ingredient' : item.kind}
                    id={item.id}
                    hostedUrl={item.image}
                    emoji={item.emoji}
                    alt={item.name}
                    className="mk-thumb"
                  />
                  <div className="mk-stack-xs">
                    <strong>{item.name}</strong>
                    <span className="mk-meta">{item.detail || item.kind}</span>
                  </div>
                </div>
                <div className="mk-two-column-grid">
                  <label className="mk-field">
                    Quantity
                    <input
                      className="mk-input"
                      value={item.quantity ?? ''}
                      disabled={!allowEdit}
                      onChange={(event) => void updatePantryItem({ ...item, quantity: event.target.value })}
                    />
                  </label>
                  <label className="mk-field">
                    Unit
                    <input
                      className="mk-input"
                      value={item.unit ?? ''}
                      disabled={!allowEdit}
                      onChange={(event) => void updatePantryItem({ ...item, unit: event.target.value })}
                    />
                  </label>
                </div>
                <label className="mk-field">
                  Status
                  <select
                    className="mk-input"
                    value={item.status ?? 'unknown'}
                    disabled={!allowEdit}
                    onChange={(event) => void updatePantryItem({ ...item, status: event.target.value })}
                  >
                    <option value="unknown">Unknown</option>
                    <option value="available">Available</option>
                    <option value="low">Low</option>
                    <option value="out">Out</option>
                  </select>
                </label>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard className="mk-stack-sm">
        <h3 className="mk-subtitle">Makeable dishes</h3>
        {makeable.length === 0 ? (
          <p className="mk-meta">Choose more ingredients to see exact matches.</p>
        ) : (
          <div className="mk-card-grid">
            {makeable.map((dish) => (
              <div key={dish.id} className="mk-subpanel mk-stack-xs">
                <div className="mk-entity-row">
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
                    <span className="mk-meta">{dish.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard className="mk-stack-sm">
        <h3 className="mk-subtitle">Ingredients in this household</h3>
        <div className="mk-card-grid">
          {state.ingredients.map((ingredient) => (
            <div key={ingredient.name} className="mk-subpanel mk-stack-xs">
              <div className="mk-entity-row">
                <LocalImageThumb
                  kind="ingredient"
                  id={ingredient.name}
                  hostedUrl={ingredient.image}
                  emoji={ingredient.emoji}
                  alt={ingredient.name}
                  className="mk-thumb"
                />
                <div className="mk-stack-xs">
                  <strong>{ingredient.name}</strong>
                  <span className="mk-meta">{[ingredient.malayalam, ingredient.gujarati].filter(Boolean).join(' · ') || 'No translations yet'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard className="mk-stack-sm">
        <h3 className="mk-subtitle">Staples</h3>
        <div className="mk-chip-row">
          {state.staples.map((staple) => (
            <span key={staple} className="mk-chip mk-chip-soft">
              {staple}
            </span>
          ))}
        </div>
      </PanelCard>
    </div>
  )
}
