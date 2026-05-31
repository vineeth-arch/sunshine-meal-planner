import { useEffect, useState } from 'react'

import { EmptyState } from '../../components/ui/EmptyState'
import { ListCard } from '../../components/ui/ListCard'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { adminHighlights } from '../../data/placeholders'
import { useAuth } from '../auth/use-auth'
import { useLocalKitchen } from '../../app/local-kitchen-context'
import { getHousehold } from '../../services/firestore/firestoreProfileService'
import type { Household, MigrationPreview, MigrationSummary } from '../../types/domain'
import { getFirebaseConfigError, hasFirebaseConfig } from '../../lib/firebase'

export function AdminScreen() {
  const { profile } = useAuth()
  const { getMigrationPreview, runLegacyMigration, syncMessage } = useLocalKitchen()
  const firebaseConfigError = getFirebaseConfigError()
  const [household, setHousehold] = useState<Household | null>(null)
  const [householdError, setHouseholdError] = useState<string | null>(null)
  const [preview, setPreview] = useState<MigrationPreview | null>(null)
  const [summary, setSummary] = useState<MigrationSummary | null>(null)
  const [migrationLoading, setMigrationLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function loadHousehold() {
      if (!profile) return

      try {
        const nextHousehold = await getHousehold(profile.householdId)
        if (!active) return
        setHousehold(nextHousehold)
        setHouseholdError(nextHousehold ? null : 'The linked household document could not be found.')
      } catch (caught) {
        if (!active) return
        setHousehold(null)
        setHouseholdError(caught instanceof Error ? caught.message : 'Could not load household details.')
      }
    }

    void loadHousehold()

    return () => {
      active = false
    }
  }, [profile])

  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Admin"
        title="Household access control"
        description={
          hasFirebaseConfig()
            ? 'Admin profiles can review the loaded household context and prepare the Firestore documents that control access for every Mom’s Kitchen account.'
            : 'Cloud sync is not configured yet. Firebase setup is still required before Firestore-backed profiles can control access.'
        }
      />

      {firebaseConfigError ? (
        <PanelCard>
          <EmptyState
            title="Cloud setup is incomplete"
            description={firebaseConfigError}
          />
        </PanelCard>
      ) : null}

      {profile ? (
        <PanelCard className="mk-stack-sm">
          <h3 className="mk-subtitle">Signed-in admin profile</h3>
          <p className="mk-meta">Display name: {profile.displayName}</p>
          <p className="mk-meta">Role: {profile.role}</p>
          <p className="mk-meta">Profile key: {profile.profileKey}</p>
          <p className="mk-meta">Household ID: {profile.householdId}</p>
        </PanelCard>
      ) : null}

      <PanelCard className="mk-stack-sm">
        <h3 className="mk-subtitle">Household document</h3>
        {household ? (
          <>
            <p className="mk-meta">Name: {household.name}</p>
            <p className="mk-meta">Owner UID: {household.ownerUid}</p>
          </>
        ) : (
          <EmptyState
            title="Household document not ready"
            description={householdError ?? 'Create the linked households/{householdId} document to complete admin setup.'}
          />
        )}
      </PanelCard>

      <PanelCard className="mk-stack-sm">
        <div className="mk-inline-title">
          <h3 className="mk-subtitle">Legacy migration</h3>
          <button
            type="button"
            className="mk-button mk-button-secondary mk-button-pad-sm"
            onClick={() => {
              void getMigrationPreview().then(setPreview)
            }}
          >
            Preview local data
          </button>
        </div>
        {syncMessage ? <p className="mk-meta">{syncMessage}</p> : null}
        {preview ? (
          <div className="mk-stack-sm">
            <p className="mk-meta">
              Found {preview.dishes.length} dishes, {preview.ingredients.length} ingredients, and {preview.staples.length} staples.
            </p>
            <p className="mk-meta">
              Weekly plan found: {preview.plan ? 'Yes' : 'No'} • Local images found: {preview.hasLocalImages ? 'Yes' : 'No'}
            </p>
            <div className="mk-inline-actions">
              <button
                type="button"
                className="mk-button mk-button-primary mk-button-pad-sm"
                disabled={!preview.hasLegacyData || migrationLoading}
                onClick={() => {
                  setMigrationLoading(true)
                  void runLegacyMigration()
                    .then(setSummary)
                    .finally(() => setMigrationLoading(false))
                }}
              >
                Import to Firestore
              </button>
            </div>
            {!preview.hasLegacyData ? (
              <EmptyState
                title="No local migration source"
                description="This browser does not currently contain the legacy localStorage kitchen data."
              />
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Preview not loaded"
            description="Load the local preview before running the one-time localStorage to Firestore migration."
          />
        )}
        {summary ? (
          <div className="mk-stack-xs">
            <p className="mk-meta">Created: {summary.created}</p>
            <p className="mk-meta">Updated: {summary.updated}</p>
            <p className="mk-meta">Skipped: {summary.skipped}</p>
            <p className="mk-meta">Failed: {summary.failed}</p>
            {summary.failures.map((failure) => (
              <p key={failure} className="mk-meta">{failure}</p>
            ))}
          </div>
        ) : null}
      </PanelCard>

      <PanelCard>
        <ListCard title="Phase-one notes" items={[...adminHighlights]} footer="No destructive migration behavior is enabled." />
      </PanelCard>
    </div>
  )
}
