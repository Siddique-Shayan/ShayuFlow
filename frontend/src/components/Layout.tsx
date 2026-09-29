import { useEffect, useState } from 'react'
import { FiBarChart2, FiBookOpen, FiCalendar, FiHome, FiLogOut, FiMenu, FiMoon, FiPlay, FiSettings, FiSun, FiUsers, FiX } from 'react-icons/fi'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../lib/theme'
import { Avatar } from './ui'

const NAV = [
  { to: '/today', label: 'Today', icon: FiHome, end: false },
  { to: '/playlists', label: 'Playlists', icon: FiBookOpen, end: false },
  { to: '/plan', label: 'Plan', icon: FiCalendar, end: false },
  { to: '/week', label: 'Week', icon: FiBarChart2, end: false },
  { to: '/friends', label: 'Buddies', icon: FiUsers, end: false },
]

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" aria-label="ShayuFlow home" className="flex w-fit items-center gap-2.5 rounded-xl transition hover:opacity-80">
      <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/30">
        <FiPlay className="size-4 translate-x-px" />
      </span>
      <span className={`text-base font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Shayu<span className={light ? 'text-indigo-200' : 'text-indigo-600'}>Flow</span>
      </span>
    </Link>
  )
}

const sideLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

/** Navigation shared by the desktop sidebar and the mobile drawer. */
function NavMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const ThemeIcon = theme === 'dark' ? FiSun : FiMoon

  return (
    <>
      <nav className="space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={sideLink} onClick={onNavigate}>
            <n.icon className="size-[18px]" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-1 pt-6">
        <NavLink to="/settings" className={sideLink} onClick={onNavigate}>
          <FiSettings className="size-[18px]" />
          Settings
        </NavLink>
        <button onClick={toggle} className={`${sideLink({ isActive: false })} w-full`}>
          <ThemeIcon className="size-[18px]" />
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="!mt-3 flex items-center gap-3 border-t border-slate-200/80 px-1 pt-4">
          <Avatar name={user?.name ?? ''} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button onClick={signOut} aria-label="Log out" title="Log out" className="btn-ghost !p-2">
            <FiLogOut className="size-4" />
          </button>
        </div>
      </div>
    </>
  )
}

export function Layout() {
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  // While the drawer is open: Escape closes it and the page behind it doesn't scroll.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200/80 p-4 md:flex"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <div className="mb-6 px-2 py-2">
          <Logo />
        </div>
        <NavMenu />
      </aside>

      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-slate-200/80 px-3 md:hidden"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center gap-1">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className="btn-ghost !p-2.5">
            <FiMenu className="size-5" />
          </button>
          <Logo />
        </div>
        <button
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="btn-ghost !p-2.5"
        >
          {theme === 'dark' ? <FiSun className="size-[18px]" /> : <FiMoon className="size-[18px]" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="animate-fade-in absolute inset-0 bg-slate-900/50" onClick={close} />
          <div
            className="animate-slide-in absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col p-4 shadow-2xl"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <div className="mb-6 flex items-center justify-between px-1">
              <Logo />
              <button onClick={close} aria-label="Close menu" className="btn-ghost !p-2">
                <FiX className="size-5" />
              </button>
            </div>
            <NavMenu onNavigate={close} />
          </div>
        </div>
      )}

      <main className="md:pl-60">
        <div className="mx-auto max-w-4xl px-4 py-5 pb-28 sm:px-6 sm:py-8 md:pb-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200/80 pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${isActive ? 'text-indigo-600' : 'text-slate-400'}`
            }
          >
            <n.icon className="size-5" />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
