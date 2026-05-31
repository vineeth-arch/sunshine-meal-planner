import { useState, type FormEvent } from 'react'

import { useLocalKitchen } from '../../app/local-kitchen-context'
import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'

export function SettingsScreen() {
  const {
    state,
    setIntegrations,
    syncMessage,
    error,
    refreshData,
    canEditData,
  } = useLocalKitchen()
  const [message, setMessage] = useState<string | null>(null)
  const [integrations, setLocalIntegrations] = useState(state.integrations)
  const allowEdit = canEditData

  function handleIntegrationsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIntegrations(integrations)
    setMessage('Local integrations saved on this device.')
  }

  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Settings"
        title="Local settings and migration tools"
        description="Keep integrations local to this browser while Firestore handles household kitchen data."
      />

      {syncMessage ? (
        <PanelCard>
          <p className="mk-meta">{syncMessage}</p>
        </PanelCard>
      ) : null}

      {error ? (
        <PanelCard className="mk-stack-sm">
          <EmptyState title="Could not load settings context" description={error} />
          <button type="button" className="mk-button mk-button-secondary mk-button-pad-sm" onClick={() => void refreshData()}>
            Retry
          </button>
        </PanelCard>
      ) : null}

      {!allowEdit ? (
        <PanelCard>
          <p className="mk-meta">Viewer access is read-only. Local integrations are visible but cannot be edited.</p>
        </PanelCard>
      ) : null}

      <PanelCard className="mk-stack-sm">
        <h3 className="mk-subtitle">Profile placeholder</h3>
        <p className="mk-meta">{state.profile.displayName}</p>
        <p className="mk-copy">{state.profile.notes}</p>
      </PanelCard>

      <PanelCard className="mk-stack-sm">
        <h3 className="mk-subtitle">Household backup tools</h3>
        <p className="mk-copy">
          Firestore household backup export and merge import now live in the Admin dashboard so access control, preview, and confirmation all stay in one place.
        </p>
        <p className="mk-meta">Settings now stays focused on device-local integrations and local placeholders only.</p>
      </PanelCard>

      <PanelCard className="mk-stack-sm">
        <form className="mk-stack-sm" onSubmit={handleIntegrationsSubmit}>
          <h3 className="mk-subtitle">Integrations</h3>
          <p className="mk-copy">These values stay local on this device. Firestore sync does not store them.</p>
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
