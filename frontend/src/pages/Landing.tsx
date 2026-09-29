import { FiArrowRight, FiCalendar, FiChevronDown, FiEdit3, FiLayers, FiMoon, FiRefreshCw, FiSkipForward, FiSun, FiUsers } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { ExplainerVideo } from '../components/ExplainerVideo'
import { Logo } from '../components/Layout'
import { IconBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../lib/theme'

const STEPS = [
  { title: 'Set your study time', text: 'Sign up, then choose how many minutes you can study on each day of the week. Set a day to 0 for a day off.' },
  { title: 'Add a playlist', text: 'Paste a YouTube playlist link, pick the date you want to finish by, and give it a priority.' },
  { title: 'Follow today’s plan', text: 'Open Today, watch the videos lined up for you and tick each one off when you finish.' },
  { title: 'Stay on track', text: 'Fall behind? Choose how to catch up. The Week page shows how you’re doing.' },
]

const FEATURES = [
  { icon: FiCalendar, tone: 'indigo', title: 'Deadline-aware plans', text: 'Earliest deadline first, or mix and weight playlists by priority.' },
  { icon: FiRefreshCw, tone: 'amber', title: 'One-tap catch-up', text: 'Spread the backlog, study more, or extend the deadline.' },
  { icon: FiLayers, tone: 'emerald', title: 'Several playlists', text: 'Run as many as you like. Priority decides who gets the time.' },
  { icon: FiSkipForward, tone: 'slate', title: 'Skip and reorder', text: 'Drop videos you don’t need and put the rest in your order.' },
  { icon: FiEdit3, tone: 'indigo', title: 'Notes on every video', text: 'Keep your takeaways right next to the lesson.' },
  { icon: FiUsers, tone: 'rose', title: 'Buddies and insights', text: 'A weekly summary and friends’ progress keep you honest.' },
] as const

const FAQ = [
  { q: 'Do I need a YouTube account?', a: 'No. Any public playlist link works.' },
  { q: 'What if I miss a day?', a: 'Those videos show as behind. Choose to spread them out, study more, or extend the deadline, or set a default in Settings.' },
  { q: 'Can I use more than one playlist?', a: 'Yes. By default the earliest deadline goes first. You can switch to interleaved or priority-weighted planning in Settings.' },
  { q: 'Who can see my progress?', a: 'Only friends you accept can see your progress and streaks. Your notes stay private.' },
]

const year = () => new Date().getFullYear()

export default function Landing() {
  const { isAuthed } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <div className="relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[560px] bg-gradient-to-b from-indigo-500/10 to-transparent" />

      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#how" className="btn-ghost hidden !px-3 sm:inline-flex">
            How it works
          </a>
          <button onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="btn-ghost !p-2.5">
            {theme === 'dark' ? <FiSun className="size-[18px]" /> : <FiMoon className="size-[18px]" />}
          </button>
          {isAuthed ? (
            <Link to="/today" className="btn-primary btn-sm">
              Open app
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm hidden sm:inline-flex">
                Log in
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-10 text-center sm:px-6 sm:pt-16">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Turn any playlist into a plan you’ll <span className="text-indigo-600">actually finish</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-500 sm:text-lg">
            Paste a link, pick a deadline. ShayuFlow builds your daily schedule, tracks your progress and re-plans when life gets in the way.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={isAuthed ? '/today' : '/register'} className="btn-primary !px-6 !py-3 text-base">
              {isAuthed ? 'Open dashboard' : 'Start planning free'} <FiArrowRight className="size-4" />
            </Link>
            <a href="#demo" className="btn-outline !px-6 !py-3 text-base">
              See how it works
            </a>
          </div>
        </section>

        {/* Animated walkthrough */}
        <section id="demo" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
          <ExplainerVideo />
        </section>

        {/* How to use */}
        <section id="how" className="scroll-mt-20 border-y border-slate-200/80 py-16 sm:py-20" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">How to use ShayuFlow</h2>
            <p className="mx-auto mt-2 max-w-md text-center text-slate-500">Four steps from a playlist link to a finished course.</p>
            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-2xl border border-slate-200/80 bg-slate-50 p-5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white dark:bg-indigo-500">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Built to keep you moving</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <IconBadge icon={f.icon} tone={f.tone} />
                <h3 className="mt-4 text-sm font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-2xl px-4 pb-16 sm:px-6 sm:pb-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Questions</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="card group !py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-slate-900">
                  {item.q}
                  <FiChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final call to action */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="rounded-3xl bg-indigo-600 px-6 py-12 text-center text-white sm:py-14">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your next playlist deserves a plan</h2>
            <p className="mx-auto mt-2 max-w-md text-indigo-100">It takes about a minute to set up.</p>
            <Link
              to={isAuthed ? '/today' : '/register'}
              className="btn mt-7 bg-white !px-6 !py-3 text-base !text-indigo-700 hover:bg-indigo-50"
            >
              {isAuthed ? 'Open dashboard' : 'Get started'} <FiArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200/80 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm text-slate-500">© {year()} ShayuFlow. Made by Shayan.</p>
        </div>
      </footer>
    </div>
  )
}
