import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home', icon: '家' },
  { to: '/library', label: 'Library', icon: '本' },
  { to: '/quiz', label: 'Quiz', icon: '問' },
  { to: '/stats', label: 'Stats', icon: '計' },
  { to: '/search', label: 'Search', icon: '探' },
]

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-lighter z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="max-w-4xl mx-auto flex justify-around items-center">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text'
              }`
            }
          >
            <span className="text-xl kanji-char mb-0.5">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
