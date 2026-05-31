import { useState, type ChangeEvent, type FormEvent } from 'react'

import { useLocalKitchen } from '../../app/local-kitchen-context'
import { LocalImageThumb } from '../../components/kitchen/LocalImageThumb'
import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import type { Dish, DishCategory } from '../../types/domain'

const CATEGORY_COLORS: Record<DishCategory, string> = {
  sabji: '#d4edda',
  curry: '#fff3cd',
  gujarati: '#e2d9f3',
}

type DraftDish = Dish & { removeLocalImage?: boolean }

function emptyDish(): DraftDish {
  return {
    id: '',
    name: '',
    category: 'sabji',
    mainIngredients: [],
    emoji: '🥗',
    bgColor: CATEGORY_COLORS.sabji,
    referenceText: '',
    recipe: '',
    youtube: '',
    image: '',
  }
}

export function DishesScreen() {
  const { state, saveDish, deleteDish, loading, error, refreshData, syncMessage, canEditData } = useLocalKitchen()
  const [filter, setFilter] = useState<'all' | DishCategory>('all')
  const [draft, setDraft] = useState<DraftDish | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const allowEdit = canEditData

  const dishes = state.repo.filter((dish) => filter === 'all' || dish.category === filter)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return

    await saveDish(
      {
        ...draft,
        mainIngredients: draft.mainIngredients,
        bgColor: CATEGORY_COLORS[draft.category],
      },
      imageFile,
      draft.removeLocalImage,
    )

    setDraft(null)
    setImageFile(null)
  }

  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Dishes"
        title="Cookbook management"
        description="Sabjis, curries, and Gujarati dishes now load from household Firestore data after login."
      />

      {syncMessage ? (
        <PanelCard>
          <p className="mk-meta">{syncMessage}</p>
        </PanelCard>
      ) : null}

      {error ? (
        <PanelCard className="mk-stack-sm">
          <EmptyState title="Could not load dishes" description={error} />
          <button type="button" className="mk-button mk-button-secondary mk-button-pad-sm" onClick={() => void refreshData()}>
            Retry
          </button>
        </PanelCard>
      ) : null}

      <PanelCard className="mk-stack-sm">
        <div className="mk-inline-actions">
          {allowEdit ? (
            <button type="button" className="mk-button mk-button-primary mk-button-pad" onClick={() => setDraft(emptyDish())}>
              Add dish
            </button>
          ) : (
            <p className="mk-meta">Viewer access is read-only. Dish editing is available to editors and admins.</p>
          )}
          {(['all', 'sabji', 'curry', 'gujarati'] as const).map((value) => (
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
      </PanelCard>

      {loading ? (
        <PanelCard>
          <p className="mk-meta">Loading dishes from Firestore...</p>
        </PanelCard>
      ) : dishes.length === 0 ? (
        <PanelCard>
          <EmptyState
            title="No dishes yet"
            description={allowEdit ? 'Add the first dish to seed this household cookbook.' : 'This household has no dishes yet.'}
          />
        </PanelCard>
      ) : (
        <div className="mk-card-grid">
          {dishes.map((dish) => (
            <PanelCard key={dish.id} className="mk-stack-sm">
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
                  <p className="mk-eyebrow">{dish.category}</p>
                  <h3 className="mk-subtitle">{dish.name}</h3>
                  <p className="mk-meta">{dish.mainIngredients.join(', ') || 'No ingredients listed'}</p>
                </div>
              </div>
              {dish.referenceText ? <p className="mk-copy">{dish.referenceText}</p> : null}
              {allowEdit ? (
                <div className="mk-inline-actions">
                  <button type="button" className="mk-button mk-button-primary mk-button-pad-sm" onClick={() => setDraft({ ...dish })}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="mk-button mk-button-danger mk-button-pad-sm"
                    onClick={() => {
                      if (!window.confirm(`Delete ${dish.name}?`)) return
                      void deleteDish(dish.id)
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </PanelCard>
          ))}
        </div>
      )}

      {draft ? (
        <div className="mk-modal-backdrop" role="presentation">
          <div className="mk-modal-card" role="dialog" aria-modal="true" aria-label="Dish editor">
            <form className="mk-stack-sm" onSubmit={handleSubmit}>
              <div className="mk-inline-title">
                <h3 className="mk-subtitle">{draft.id ? 'Edit dish' : 'Add dish'}</h3>
                <button type="button" className="mk-button mk-button-secondary mk-button-pad-xs" onClick={() => setDraft(null)}>
                  Close
                </button>
              </div>

              <label className="mk-field">
                Name
                <input
                  className="mk-input"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  required
                />
              </label>

              <div className="mk-two-column-grid">
                <label className="mk-field">
                  Category
                  <select
                    className="mk-input"
                    value={draft.category}
                    onChange={(event) => {
                      const category = event.target.value as DishCategory
                      setDraft({ ...draft, category, bgColor: CATEGORY_COLORS[category] })
                    }}
                  >
                    <option value="sabji">Sabji</option>
                    <option value="curry">Curry</option>
                    <option value="gujarati">Gujarati</option>
                  </select>
                </label>
                <label className="mk-field">
                  Emoji
                  <input
                    className="mk-input"
                    value={draft.emoji}
                    onChange={(event) => setDraft({ ...draft, emoji: event.target.value })}
                  />
                </label>
              </div>

              <label className="mk-field">
                Main ingredients
                <input
                  className="mk-input"
                  value={draft.mainIngredients.join(', ')}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      mainIngredients: event.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>

              <label className="mk-field">
                Reference note
                <textarea
                  className="mk-input mk-textarea"
                  rows={3}
                  value={draft.referenceText}
                  onChange={(event) => setDraft({ ...draft, referenceText: event.target.value })}
                />
              </label>

              <label className="mk-field">
                Recipe
                <textarea
                  className="mk-input mk-textarea"
                  rows={4}
                  value={draft.recipe}
                  onChange={(event) => setDraft({ ...draft, recipe: event.target.value })}
                />
              </label>

              <div className="mk-two-column-grid">
                <label className="mk-field">
                  YouTube URL
                  <input
                    className="mk-input"
                    value={draft.youtube}
                    onChange={(event) => setDraft({ ...draft, youtube: event.target.value })}
                  />
                </label>
                <label className="mk-field">
                  Hosted image URL
                  <input
                    className="mk-input"
                    value={draft.image}
                    onChange={(event) => setDraft({ ...draft, image: event.target.value })}
                  />
                </label>
              </div>

              <label className="mk-field">
                Local image upload
                <input
                  className="mk-input"
                  type="file"
                  accept="image/*"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setImageFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <label className="mk-check-card">
                <input
                  type="checkbox"
                  checked={Boolean(draft.removeLocalImage)}
                  onChange={(event) => setDraft({ ...draft, removeLocalImage: event.target.checked })}
                />
                <span>Remove stored local image blob for this dish</span>
              </label>

              <div className="mk-inline-actions">
                <button type="submit" className="mk-button mk-button-primary mk-button-pad">
                  Save dish
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
