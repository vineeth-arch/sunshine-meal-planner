import { useState, type ChangeEvent, type FormEvent } from 'react'

import { useLocalKitchen } from '../../app/local-kitchen-context'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { canEdit } from '../auth/access'
import { useAuth } from '../auth/use-auth'

export function SettingsScreen() {
  const { state, exportJson, importJson, setIntegrations } = useLocalKitchen()
  const { profile } = useAuth()
  const [importText, setImportText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [integrations, setLocalIntegrations] = useState(state.integrations)
  const allowEdit = canEdit(profile)

  function runImport(text: string) {
    try {
      const stats = importJson(text)
      setMessage(
        `Imported: +${stats.dishAdd} dishes, ${stats.dishUpd} updated, +${stats.ingAdd} ingredients, ${stats.ingUpd} ingredient updates.`,
      )
      setImportText('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    runImport(text)
    event.target.value = ''
  }

  function handleIntegrationsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIntegrations(integrations)
    setMessage('Local integrations saved on this device.')
  }

  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Settings"
        title="Local settings and backup tools"
        description="Import and export the legacy JSON shape, keep integrations local, and leave auth and Firebase out of this phase."
      />

      {!allowEdit ? (
        <PanelCard>
          <p className="mk-meta">Viewer access is read-only. Export is available, but imports and local settings edits are disabled.</p>
        </PanelCard>
      ) : null}

      <PanelCard className="mk-stack-sm">
        <h3 className="mk-subtitle">Profile placeholder</h3>
        <p className="mk-meta">{state.profile.displayName}</p>
        <p className="mk-copy">{state.profile.notes}</p>
      </PanelCard>

      <PanelCard className="mk-stack-sm">
        <h3 className="mk-subtitle">Export data</h3>
        <p className="mk-copy">
          JSON export preserves the legacy schema for dishes, ingredients, and staples. Local IndexedDB image blobs are not included.
        </p>
        <div className="mk-inline-actions">
          <button
            type="button"
            className="mk-button mk-button-primary mk-button-pad"
            onClick={() => {
              const blob = new Blob([exportJson], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const anchor = document.createElement('a')
              anchor.href = url
              anchor.download = 'moms-kitchen-cookbook.json'
              anchor.click()
              URL.revokeObjectURL(url)
              setMessage('Downloaded current JSON export.')
            }}
          >
            Download JSON
          </button>
          <button
            type="button"
            className="mk-button mk-button-secondary mk-button-pad"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(exportJson)
                setMessage('Copied export JSON to clipboard.')
              } catch {
                setMessage('Clipboard copy failed in this browser.')
              }
            }}
          >
            Copy JSON
          </button>
        </div>
        <textarea className="mk-input mk-textarea" rows={10} readOnly value={exportJson} />
      </PanelCard>

      <PanelCard className="mk-stack-sm">
        <h3 className="mk-subtitle">Import data</h3>
        <p className="mk-copy">Existing items are updated and new ones are added. Missing items are not deleted.</p>
        {allowEdit ? (
          <>
            <label className="mk-field">
              Import JSON file
              <input className="mk-input" type="file" accept="application/json,.json" onChange={handleFile} />
            </label>
            <textarea
              className="mk-input mk-textarea"
              rows={8}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Paste legacy export JSON here"
            />
            <button
              type="button"
              className="mk-button mk-button-primary mk-button-pad"
              onClick={() => runImport(importText)}
              disabled={!importText.trim()}
            >
              Import pasted JSON
            </button>
          </>
        ) : (
          <p className="mk-meta">Import controls are hidden for viewer accounts.</p>
        )}
      </PanelCard>

      <PanelCard className="mk-stack-sm">
        <form className="mk-stack-sm" onSubmit={handleIntegrationsSubmit}>
          <h3 className="mk-subtitle">Integrations</h3>
          <p className="mk-copy">These values stay local for compatibility with the old app. Firebase and auth are intentionally not wired in.</p>
          <label className="mk-field">
            LLM base URL
            <input
              className="mk-input"
              value={integrations.llmBaseUrl ?? ''}
              onChange={(event) => setLocalIntegrations({ ...integrations, llmBaseUrl: event.target.value })}
              disabled={!allowEdit}
            />
          </label>
          <label className="mk-field">
            LLM key
            <input
              className="mk-input"
              type="password"
              value={integrations.llmKey ?? ''}
              onChange={(event) => setLocalIntegrations({ ...integrations, llmKey: event.target.value })}
              disabled={!allowEdit}
            />
          </label>
          <label className="mk-field">
            LLM model
            <input
              className="mk-input"
              value={integrations.llmModel ?? ''}
              onChange={(event) => setLocalIntegrations({ ...integrations, llmModel: event.target.value })}
              disabled={!allowEdit}
            />
          </label>
          <label className="mk-field">
            imgbb key
            <input
              className="mk-input"
              type="password"
              value={integrations.imgbbKey ?? ''}
              onChange={(event) => setLocalIntegrations({ ...integrations, imgbbKey: event.target.value })}
              disabled={!allowEdit}
            />
          </label>
          {allowEdit ? (
            <button type="submit" className="mk-button mk-button-primary mk-button-pad">
              Save integrations
            </button>
          ) : null}
        </form>
      </PanelCard>

      {message ? (
        <PanelCard>
          <p className="mk-meta">{message}</p>
        </PanelCard>
      ) : null}
    </div>
  )
}
