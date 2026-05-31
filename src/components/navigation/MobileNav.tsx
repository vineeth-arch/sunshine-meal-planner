import { NavLink } from 'react-router-dom'

const primaryNavItems = [
  { to: '/dashboard', label: 'Dashboard', shortLabel: 'Home' },
  { to: '/today', label: 'Today', shortLabel: 'Today' },
  { to: '/tomorrow', label: 'Tomorrow', shortLabel: 'Tomorrow' },
  { to: '/week-planner', label: 'Week Planner', shortLabel: 'Week' },
  { to: '/pantry', label: 'Pantry', shortLabel: 'Pantry' },
]

export function MobileNav() {
  return (
    <nav className="mk-bottom-nav" aria-label="Primary">
      {primaryNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `mk-bottom-nav-item${isActive ? ' mk-bottom-nav-item-active' : ''}`}
        >
          <span className="mk-bottom-nav-label">{item.shortLabel}</span>
          <span className="mk-bottom-nav-hint">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
