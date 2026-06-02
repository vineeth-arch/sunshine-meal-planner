import { useState, type ChangeEvent, type FormEvent } from 'react'

import { useLocalKitchen } from '../../app/local-kitchen-context'
import { LocalImageThumb } from '../../components/kitchen/LocalImageThumb'
import { UploadThingImageField } from '../../components/kitchen/UploadThingImageField'
import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import type { Ingredient } from '../../types/domain'

type DraftIngredient = Ingredient & { previousName?: string; removeLocalImage?: boolean }

function emptyIngredient(): DraftIngredient {
  return {
    name: '',
    emoji: '🥗',
    malayalam: '',
    gujarati: '',
    image: '',
  }
}

export function IngredientsScreen() {
  const {
    state,
    saveIngredient,
    deleteIngredient,
    addStaple,
    removeStaple,
    loading,
    error,
    refreshData,
    syncMessage,
    canEditData,
  } = useLocalKitchen()
  const [draft, setDraft] = useState<DraftIngredient | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [newStaple, setNewStaple] = useState('')
  const allowEdit = canEditData

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    await saveIngredient(draft, imageFile, draft.removeLocalImage)
    setDraft(null)
    setImageFile(null)
  }

  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Ingredients"
        title="Ingredient reference"
        description="Manage shared ingredient references, staple exclusions, and local image cache while Supabase stores household data."
      />

      {syncMessage ? (
        <PanelCard>
          <p className="mk-meta">{syncMessage}</p>
        </PanelCard>
      ) : null}

      {error ? (
        <PanelCard className="mk-stack-sm">
          <EmptyState title="Could not load ingredients" description={error} />
          <button type="button" className="mk-button mk-button-secondary mk-button-pad-sm" onClick={() => void refreshData()}>
            Retry
          </button>
        </PanelCard>
      ) : null}

      <PanelCard className="mk-stack-sm">
        <div className="mk-inline-actions">
          {allowEdit ? (
            <button type="button" className="mk-button mk-button-primary mk-button-pad" onClick={() => setDraft(emptyIngredient())}>
              Add ingredient
            </button>
          ) : (
            <p className="mk-meta">Member access is read-only. Ingredient and staple changes are disabled.</p>
          )}
        </div>
        <div className="mk-stack-sm">
          <h3 className="mk-subtitle">Staples</h3>
          <div className="mk-chip-row">
            {state.staples.map((staple) => (
              <span key={staple} className="mk-chip mk-chip-soft">
                {staple}
                {allowEdit ? (
                  <button type="button" className="mk-inline-link" onClick={() => void removeStaple(staple)}>
                    remove
                  </button>
                ) : null}
              </span>
            ))}
          </div>
          {allowEdit ? (
            <div className="mk-inline-actions">
              <input className="mk-input" value={newStaple} onChange={(event) => setNewStaple(event.target.value)} placeholder="Add staple" />
              <button
                type="button"
                className="mk-button mk-button-secondary mk-button-pad-sm"
                onClick={() => {
                  void addStaple(newStaple)
                  setNewStaple('')
                }}
              >
                Add staple
              </button>
            </div>
          ) : null}
        </div>
      </PanelCard>

      {loading ? (
        <PanelCard>
          <p className="mk-meta">Loading ingredients from Supabase...</p>
        </PanelCard>
      ) : state.ingredients.length === 0 ? (
        <PanelCard>
          <EmptyState
            title="No ingredients yet"
            description={allowEdit ? 'Add ingredients or import legacy data to populate the pantry reference.' : 'This household has no ingredients yet.'}
          />
        </PanelCard>
      ) : (
        <div className="mk-card-grid">
          {state.ingredients.map((ingredient) => (
            <PanelCard key={ingredient.name} className="mk-stack-sm">
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
                  <h3 className="mk-subtitle">{ingredient.name}</h3>
                  <p className="mk-meta">{[ingredient.malayalam, ingredient.gujarati].filter(Boolean).join(' · ') || 'No translations yet'}</p>
                </div>
              </div>
              {allowEdit ? (
                <div className="mk-inline-actions">
                  <button
                    type="button"
                    className="mk-button mk-button-primary mk-button-pad-sm"
                    onClick={() => setDraft({ ...ingredient, previousName: ingredient.name })}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="mk-button mk-button-danger mk-button-pad-sm"
                    onClick={() => {
                      if (!window.confirm(`Delete ${ingredient.name}?`)) return
                      void deleteIngredient(ingredient.name)
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
          <div className="mk-modal-card" role="dialog" aria-modal="true" aria-label="Ingredient editor">
            <form className="mk-stack-sm" onSubmit={handleSubmit}>
              <div className="mk-inline-title">
                <h3 className="mk-subtitle">{draft.previousName ? 'Edit ingredient' : 'Add ingredient'}</h3>
                <button type="button" className="mk-button mk-button-secondary mk-button-pad-xs" onClick={() => setDraft(null)}>
                  Close
                </button>
              </div>

              <div className="mk-two-column-grid">
                <label className="mk-field">
                  Name
                  <input className="mk-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
                </label>
                <label className="mk-field">
                  Emoji
                  <input className="mk-input" value={draft.emoji} onChange={(event) => setDraft({ ...draft, emoji: event.target.value })} />
                </label>
              </div>

              <div className="mk-two-column-grid">
                <label className="mk-field">
                  Malayalam
                  <input className="mk-input" value={draft.malayalam} onChange={(event) => setDraft({ ...draft, malayalam: event.target.value })} />
                </label>
                <label className="mk-field">
                  Gujarati
                  <input className="mk-input" value={draft.gujarati} onChange={(event) => setDraft({ ...draft, gujarati: event.target.value })} />
                </label>
              </div>

              <label className="mk-field">
                Hosted image URL
                <input className="mk-input" value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} />
              </label>

              <UploadThingImageField
                disabled={!allowEdit}
                onUploaded={(url) => setDraft({ ...draft, image: url })}
              />

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
                <span>Remove stored local image blob for this ingredient</span>
              </label>

              <button type="submit" className="mk-button mk-button-primary mk-button-pad">
                Save ingredient
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
