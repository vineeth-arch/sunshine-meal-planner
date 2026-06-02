import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'

import { EmptyState } from '../../components/ui/EmptyState'
import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { StatCard } from '../../components/ui/StatCard'
import { getCloudConfigError, isCloudConfigured } from '../../lib/supabase'
import type { AdminImportPreview, AdminRoleLabels, UserRole } from '../../types/domain'
import {
  exportHouseholdBackup,
  getAdminDashboardData,
  importHouseholdBackup,
  previewHouseholdImport,
  saveAdminRoleLabels,
  type AdminDashboardData,
} from '../../services/supabase/admin'
import { useAuth } from '../auth/use-auth'

const DEFAULT_ROLE_LABELS: AdminRoleLabels = {
  admin: 'Admin',
  editor: 'Editor',
  member: 'Member',
}

function formatTimestamp(value?: string | null): string {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDateString(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function roleLabelFor(role: UserRole, labels: AdminRoleLabels): string {
  return labels[role]
}

export function AdminScreen() {
  const { profile, user } = useAuth()
  const cloudConfigError = getCloudConfigError()
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [exportJson, setExportJson] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [importText, setImportText] = useState('')
  const [importPreview, setImportPreview] = useState<AdminImportPreview | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [roleLabels, setRoleLabels] = useState<AdminRoleLabels>(DEFAULT_ROLE_LABELS)
  const [roleLabelSaving, setRoleLabelSaving] = useState(false)

  const loadDashboard = useCallback(async () => {
    if (!profile || !user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const nextDashboard = await getAdminDashboardData({ profile, user })
      setDashboard(nextDashboard)
      setRoleLabels({
        admin: nextDashboard.settings?.roleLabels?.admin?.trim() || DEFAULT_ROLE_LABELS.admin,
        editor: nextDashboard.settings?.roleLabels?.editor?.trim() || DEFAULT_ROLE_LABELS.editor,
        member: nextDashboard.settings?.roleLabels?.member?.trim() || DEFAULT_ROLE_LABELS.member,
      })
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load admin dashboard.')
    } finally {
      setLoading(false)
    }
  }, [profile, user])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadDashboard])

  const exportSummary = useMemo(() => {
    if (!importPreview) return null
    return [
      ['Profiles', importPreview.operations.profiles],
      ['Dishes', importPreview.operations.dishes],
      ['Ingredients', importPreview.operations.ingredients],
      ['Staples', importPreview.operations.staples],
      ['Pantry items', importPreview.operations.pantryItems],
      ['Weekly plans', importPreview.operations.weeklyPlans],
      ['Meal slots', importPreview.operations.mealSlots],
    ] as const
  }, [importPreview])

  async function handleExport() {
    if (!profile || !user) return

    setExportLoading(true)
    try {
      const payload = await exportHouseholdBackup({ profile, user })
      const nextJson = JSON.stringify(payload, null, 2)
      setExportJson(nextJson)
      setMessage(`Prepared household backup exported ${formatDateString(payload.exportedAt)}.`)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not export backup.')
    } finally {
      setExportLoading(false)
    }
  }

  async function handleImportPreview(text: string) {
    if (!profile || !user || !text.trim()) return

    setImportLoading(true)
    try {
      const preview = await previewHouseholdImport({ profile, user }, text)
      setImportPreview(preview)
      setMessage(`Preview ready for ${preview.counts.dishes} dishes and ${preview.counts.ingredients} ingredients.`)
    } catch (caught) {
      setImportPreview(null)
      setMessage(caught instanceof Error ? caught.message : 'Could not preview backup import.')
    } finally {
      setImportLoading(false)
    }
  }

  async function handleImportConfirm() {
    if (!profile || !user || !importPreview) return

    setImportLoading(true)
    try {
      const result = await importHouseholdBackup({ profile, user }, importPreview)
      setMessage(
        `Imported backup with merge-only writes: ${result.profiles.add + result.profiles.update} profiles, ${result.dishes.add + result.dishes.update} dishes, ${result.ingredients.add + result.ingredients.update} ingredients, ${result.staples.add + result.staples.update} staples, ${result.pantryItems.add + result.pantryItems.update} pantry items, ${result.weeklyPlans.add + result.weeklyPlans.update} weekly plans, and ${result.mealSlots.add + result.mealSlots.update} meal slots.`,
      )
      setImportText('')
      setImportPreview(null)
      await loadDashboard()
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not import backup.')
    } finally {
      setImportLoading(false)
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setImportText(text)
    await handleImportPreview(text)
    event.target.value = ''
  }

  async function handleSaveRoleLabels() {
    if (!profile || !user) return

    setRoleLabelSaving(true)
    try {
      const saved = await saveAdminRoleLabels({ profile, user }, roleLabels)
      setRoleLabels({
        admin: saved.roleLabels?.admin?.trim() || DEFAULT_ROLE_LABELS.admin,
        editor: saved.roleLabels?.editor?.trim() || DEFAULT_ROLE_LABELS.editor,
        member: saved.roleLabels?.member?.trim() || DEFAULT_ROLE_LABELS.member,
      })
      setDashboard((current) => (current ? { ...current, settings: saved } : current))
      setMessage('Saved display-only role labels for the admin dashboard.')
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not save role labels.')
    } finally {
      setRoleLabelSaving(false)
    }
  }

  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Admin"
        title="Household admin dashboard"
        description={
          isCloudConfigured()
            ? 'Review linked profiles, inspect household data volume, export Supabase backups, preview merge imports, and manage display-only role labels.'
            : 'Cloud sync is not configured yet. Supabase setup is required before this admin dashboard can manage household data.'
        }
      />

      {cloudConfigError ? (
        <PanelCard>
          <EmptyState title="Cloud setup is incomplete" description={cloudConfigError} />
        </PanelCard>
      ) : null}

      {error ? (
        <PanelCard className="mk-stack-sm">
          <EmptyState title="Could not load admin data" description={error} />
          <button type="button" className="mk-button mk-button-secondary mk-button-pad-sm" onClick={() => void loadDashboard()}>
            Retry
          </button>
        </PanelCard>
      ) : null}

      {message ? (
        <PanelCard>
          <p className="mk-meta">{message}</p>
        </PanelCard>
      ) : null}

      {profile ? (
        <PanelCard className="mk-stack-sm">
          <div className="mk-inline-title">
            <h3 className="mk-subtitle">Signed-in admin</h3>
            <button type="button" className="mk-button mk-button-secondary mk-button-pad-sm" onClick={() => void loadDashboard()} disabled={loading}>
              Refresh
            </button>
          </div>
          <div className="mk-admin-grid">
            <div className="mk-subpanel mk-stack-xs">
              <p className="mk-meta">Display name</p>
              <p className="mk-copy">{profile.displayName}</p>
            </div>
            <div className="mk-subpanel mk-stack-xs">
              <p className="mk-meta">Role</p>
              <p className="mk-copy">{roleLabelFor(profile.role, roleLabels)}</p>
            </div>
            {profile.isSuperadmin ? (
              <div className="mk-subpanel mk-stack-xs">
                <p className="mk-meta">Platform role</p>
                <p className="mk-copy">Superadmin</p>
              </div>
            ) : null}
            <div className="mk-subpanel mk-stack-xs">
              <p className="mk-meta">Household</p>
              <p className="mk-copy">{profile.householdId}</p>
            </div>
          </div>
        </PanelCard>
      ) : null}

      {dashboard ? (
        <>
          <PanelCard className="mk-stack-sm">
            <h3 className="mk-subtitle">Household summary</h3>
            <div className="mk-admin-grid">
              <div className="mk-subpanel mk-stack-xs">
                <p className="mk-meta">Household name</p>
                <p className="mk-copy">{dashboard.household.name}</p>
              </div>
              <div className="mk-subpanel mk-stack-xs">
                <p className="mk-meta">Owner UID</p>
                <p className="mk-copy mk-break-word">{dashboard.household.ownerUid}</p>
              </div>
              <div className="mk-subpanel mk-stack-xs">
                <p className="mk-meta">Created</p>
                <p className="mk-copy">{formatDateString(dashboard.household.createdAt)}</p>
              </div>
              <div className="mk-subpanel mk-stack-xs">
                <p className="mk-meta">Updated</p>
                <p className="mk-copy">{formatDateString(dashboard.household.updatedAt)}</p>
              </div>
            </div>
          </PanelCard>

          <PanelCard className="mk-stack-sm">
            <h3 className="mk-subtitle">Profiles</h3>
            {dashboard.profiles.length ? (
              <div className="mk-stack-sm">
                {dashboard.profiles.map((entry) => (
                  <div key={entry.uid} className="mk-subpanel mk-stack-xs">
                    <div className="mk-inline-title">
                      <h4 className="mk-subtitle">{entry.displayName}</h4>
                      <span className="mk-profile-badge">{roleLabelFor(entry.role, roleLabels)}</span>
                    </div>
                    <p className="mk-meta">Email: {entry.email || 'Not available'}</p>
                    {entry.isSuperadmin ? <p className="mk-meta">Platform superadmin</p> : null}
                    <p className="mk-meta">Household ID: {entry.householdId}</p>
                    <p className="mk-meta">UID: {entry.uid}</p>
                    <p className="mk-meta">Last login: {entry.lastLoginAt ? formatDateString(entry.lastLoginAt) : 'Not available'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No household profiles" description="No profile documents were returned for this household." />
            )}
          </PanelCard>

          <PanelCard className="mk-stack-sm">
            <h3 className="mk-subtitle">Data counts</h3>
            <div className="mk-stat-grid">
              <StatCard label="Dishes" value={String(dashboard.counts.dishes)} tone="accent" />
              <StatCard label="Ingredients" value={String(dashboard.counts.ingredients)} />
              <StatCard label="Pantry items" value={String(dashboard.counts.pantryItems)} />
              <StatCard label="Weekly plans" value={String(dashboard.counts.weeklyPlans)} />
            </div>
          </PanelCard>

          <PanelCard className="mk-stack-sm">
            <h3 className="mk-subtitle">Recent changes</h3>
            {dashboard.recentChanges.length ? (
              <div className="mk-stack-sm">
                {dashboard.recentChanges.map((entry) => (
                  <div key={`${entry.collection}-${entry.id}`} className="mk-subpanel mk-stack-xs">
                    <div className="mk-inline-title">
                      <h4 className="mk-subtitle">{entry.label}</h4>
                      <span className="mk-profile-badge">{entry.collection}</span>
                    </div>
                    <p className="mk-meta">Updated by: {entry.updatedBy}</p>
                    <p className="mk-meta">Updated at: {formatTimestamp(entry.updatedAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No recent changes yet" description="This household has not stored any updatedAt or updatedBy metadata that can be displayed here." />
            )}
          </PanelCard>

          <PanelCard className="mk-stack-sm">
            <h3 className="mk-subtitle">Role labels</h3>
            <p className="mk-copy">These labels are display-only. They do not change user permissions, auth guards, or Supabase RLS.</p>
            <label className="mk-field">
              Admin label
              <input className="mk-input" value={roleLabels.admin} onChange={(event) => setRoleLabels({ ...roleLabels, admin: event.target.value })} />
            </label>
            <label className="mk-field">
              Editor label
              <input className="mk-input" value={roleLabels.editor} onChange={(event) => setRoleLabels({ ...roleLabels, editor: event.target.value })} />
            </label>
            <label className="mk-field">
              Member label
              <input className="mk-input" value={roleLabels.member} onChange={(event) => setRoleLabels({ ...roleLabels, member: event.target.value })} />
            </label>
            <button type="button" className="mk-button mk-button-primary mk-button-pad" onClick={() => void handleSaveRoleLabels()} disabled={roleLabelSaving}>
              Save role labels
            </button>
          </PanelCard>

          <PanelCard className="mk-stack-sm">
            <h3 className="mk-subtitle">Backup export</h3>
            <p className="mk-copy">Exports include household metadata, profiles, settings, dishes, ingredients, staples, pantry items, weekly plans, and meal slots in backup schema v1.</p>
            <div className="mk-inline-actions">
              <button type="button" className="mk-button mk-button-primary mk-button-pad" onClick={() => void handleExport()} disabled={exportLoading}>
                Generate backup JSON
              </button>
              <button
                type="button"
                className="mk-button mk-button-secondary mk-button-pad"
                disabled={!exportJson}
                onClick={() => {
                  const blob = new Blob([exportJson], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const anchor = document.createElement('a')
                  anchor.href = url
                  anchor.download = `moms-kitchen-household-${dashboard.household.id}-backup.json`
                  anchor.click()
                  URL.revokeObjectURL(url)
                  setMessage('Downloaded the current household backup JSON.')
                }}
              >
                Download JSON
              </button>
              <button
                type="button"
                className="mk-button mk-button-secondary mk-button-pad"
                disabled={!exportJson}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(exportJson)
                    setMessage('Copied household backup JSON to the clipboard.')
                  } catch {
                    setMessage('Clipboard copy failed in this browser.')
                  }
                }}
              >
                Copy JSON
              </button>
            </div>
            {exportJson ? <textarea className="mk-input mk-textarea" rows={12} readOnly value={exportJson} /> : null}
          </PanelCard>

          <PanelCard className="mk-stack-sm">
            <h3 className="mk-subtitle">Backup import</h3>
            <p className="mk-copy">Imports are preview-first and merge-only. Missing records are never deleted, and the dashboard will not blindly overwrite the entire household.</p>
            <label className="mk-field">
              Import backup JSON file
              <input className="mk-input" type="file" accept="application/json,.json" onChange={handleImportFile} />
            </label>
            <textarea
              className="mk-input mk-textarea"
              rows={10}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Paste a household backup JSON payload here"
            />
            <button type="button" className="mk-button mk-button-secondary mk-button-pad" onClick={() => void handleImportPreview(importText)} disabled={!importText.trim() || importLoading}>
              Preview merge import
            </button>

            {importPreview ? (
              <div className="mk-subpanel mk-stack-sm">
                <p className="mk-meta">Backup exported: {formatDateString(importPreview.payload.exportedAt)}</p>
                <p className="mk-meta">Household ID: {importPreview.payload.householdId}</p>
                <div className="mk-stack-xs">
                  {exportSummary?.map(([label, counts]) => (
                    <p key={label} className="mk-meta">{label}: {counts.add} add, {counts.update} update</p>
                  ))}
                </div>
                <button type="button" className="mk-button mk-button-primary mk-button-pad" onClick={() => void handleImportConfirm()} disabled={importLoading}>
                  Confirm merge import
                </button>
              </div>
            ) : null}
          </PanelCard>

          <PanelCard className="mk-stack-sm">
            <h3 className="mk-subtitle">Dangerous actions</h3>
            <div className="mk-admin-warning">
              <p className="mk-copy">Household deletion, profile removal, and destructive data wipes are intentionally not implemented in this pass.</p>
              <p className="mk-meta">If destructive tooling is ever added later, it should require explicit approval, stronger confirmation, and separate review.</p>
            </div>
          </PanelCard>
        </>
      ) : null}

      {loading && !dashboard ? (
        <PanelCard>
          <p className="mk-meta">Loading household admin data...</p>
        </PanelCard>
      ) : null}
    </div>
  )
}
