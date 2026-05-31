import { useEffect, useState } from 'react'

import { EmptyState } from '../../components/ui/EmptyState'
import { ListCard } from '../../components/ui/ListCard'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { adminHighlights } from '../../data/placeholders'
import { useAuth } from '../auth/use-auth'
import { getHousehold } from '../../services/firestore/firestoreProfileService'
import type { Household } from '../../types/domain'
import { getFirebaseConfigError, hasFirebaseConfig } from '../../lib/firebase'

export function AdminScreen() {
  const { profile } = useAuth()
  const firebaseConfigError = getFirebaseConfigError()
  const [household, setHousehold] = useState<Household | null>(null)
  const [householdError, setHouseholdError] = useState<string | null>(null)

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

      <PanelCard>
        <ListCard title="Phase-one notes" items={[...adminHighlights]} footer="No destructive migration behavior is enabled." />
      </PanelCard>
    </div>
  )
}
