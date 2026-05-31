import { NavLink, Outlet } from 'react-router-dom'

import { MobileNav } from '../components/navigation/MobileNav'
import { getProfileLabelFromEmail } from '../features/auth/profile-options'
import { useAuth } from '../features/auth/use-auth'

export function AppShell() {
  const { profile, signOutUser, user } = useAuth()
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date())
  const signedInLabel = profile?.displayName || getProfileLabelFromEmail(user?.email) || user?.email || 'Signed in'

  return (
    <div className="mk-app-frame">
      <div className="mk-app-shell">
        <header className="mk-topbar">
          <div>
            <p className="mk-eyebrow">Mom&apos;s Kitchen</p>
            <h1 className="mk-title">Family planning hub</h1>
            <p className="mk-meta">{signedInLabel} • {dateLabel}</p>
          </div>
          <div className="mk-topbar-actions">
            <NavLink to="/ingredients" className="mk-chip mk-chip-soft">
              Ingredients
            </NavLink>
            <NavLink to="/settings" className="mk-chip mk-chip-strong">
              Settings
            </NavLink>
            <button type="button" className="mk-chip mk-chip-soft" onClick={() => void signOutUser()}>
              Logout
            </button>
          </div>
        </header>

        <main className="mk-main-content">
          <Outlet />
        </main>

        <MobileNav />
      </div>
    </div>
  )
}
