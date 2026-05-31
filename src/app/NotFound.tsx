import { Link } from 'react-router-dom'

import { PanelCard } from '../components/ui/PanelCard'

export function NotFound() {
  return (
    <section className="mk-stack-lg">
      <PanelCard className="mk-stack-md">
        <p className="mk-eyebrow">Not found</p>
        <h2 className="mk-section-title">That page is not part of this phase.</h2>
        <p className="mk-copy">
          The route does not exist in the new foundation yet. Use the main navigation to return to the active
          placeholder screens.
        </p>
        <div className="mk-inline-actions">
          <Link to="/dashboard" className="mk-button mk-button-primary">
            Go to dashboard
          </Link>
        </div>
      </PanelCard>
    </section>
  )
}
