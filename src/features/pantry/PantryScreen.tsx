import { useMemo, useState } from 'react'

import { useLocalKitchen } from '../../app/local-kitchen-context'
import { LocalImageThumb } from '../../components/kitchen/LocalImageThumb'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

export function PantryScreen() {
  const { state, runFridgePlan, suggestFromIngredients } = useLocalKitchen()
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [includeGujarati, setIncludeGujarati] = useState(true)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const makeable = useMemo(
    () => suggestFromIngredients(selectedIngredients).filter((dish) => includeGujarati || dish.category !== 'gujarati'),
    [includeGujarati, selectedIngredients, suggestFromIngredients],
  )

  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Pantry"
        title="Local-first pantry"
        description="See the ingredients and staples the planner uses, then generate today and tomorrow from what is already available."
      />

      <PanelCard className="mk-stack-sm">
        <div className="mk-inline-title">
          <h3 className="mk-subtitle">Plan from fridge</h3>
          <button
            type="button"
            className="mk-button mk-button-primary mk-button-pad-sm"
            onClick={() => {
              const result = runFridgePlan(selectedIngredients, includeGujarati)
              setResultMessage(
                result.makeableCount === 0
                  ? 'Nothing makeable with those ingredients yet.'
                  : `Filled ${result.filledCount} slots from ${result.makeableCount} makeable dishes.`,
              )
            }}
          >
            Generate plan
          </button>
        </div>

        <label className="mk-check-card">
          <input type="checkbox" checked={includeGujarati} onChange={(event) => setIncludeGujarati(event.target.checked)} />
          <span>Include Gujarati dishes</span>
        </label>

        <div className="mk-check-grid">
          {state.ingredients.map((ingredient) => {
            const checked = selectedIngredients.includes(ingredient.name)
            return (
              <label key={ingredient.name} className="mk-check-card">
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
        <h3 className="mk-subtitle">Ingredients on this device</h3>
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
