import { usePwaStatus } from '../../app/use-pwa-status'

export function PwaStatusBanners() {
  const { isOffline, needRefresh, dismissUpdate, applyUpdate } = usePwaStatus()

  if (!isOffline && !needRefresh) {
    return null
  }

  return (
    <div className="mk-stack-sm">
      {isOffline ? (
        <section className="mk-status-banner mk-status-banner-warning" role="status" aria-live="polite">
          <p className="mk-status-title">You are offline</p>
          <p className="mk-status-copy">Some cloud data may not sync until online</p>
        </section>
      ) : null}

      {needRefresh ? (
        <section className="mk-status-banner mk-status-banner-neutral" role="status" aria-live="polite">
          <div className="mk-stack-xs">
            <p className="mk-status-title">Update available</p>
            <p className="mk-status-copy">Refresh Mom&apos;s Kitchen to load the latest version safely.</p>
          </div>
          <div className="mk-inline-actions">
            <button
              type="button"
              className="mk-button mk-button-primary mk-button-pad-sm"
              onClick={() => void applyUpdate()}
            >
              Refresh
            </button>
            <button
              type="button"
              className="mk-button mk-button-secondary mk-button-pad-sm"
              onClick={dismissUpdate}
            >
              Later
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export function PwaStatusViewport() {
  return (
    <div className="mk-status-viewport">
      <PwaStatusBanners />
    </div>
  )
}
