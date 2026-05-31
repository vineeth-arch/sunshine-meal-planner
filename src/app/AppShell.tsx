import { NavLink, Outlet } from 'react-router-dom'

import { MobileNav } from '../components/navigation/MobileNav'

export function AppShell() {
  return (
    <div className="mk-app-frame">
      <div className="mk-app-shell">
        <header className="mk-topbar">
          <div>
            <p className="mk-eyebrow">Mom&apos;s Kitchen</p>
            <h1 className="mk-title">Family planning hub</h1>
          </div>
          <div className="mk-topbar-actions">
            <NavLink to="/settings" className="mk-chip mk-chip-soft">
              Settings
            </NavLink>
            <NavLink to="/admin" className="mk-chip mk-chip-strong">
              Admin
            </NavLink>
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
