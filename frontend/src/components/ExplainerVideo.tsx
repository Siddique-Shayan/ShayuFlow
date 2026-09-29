import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { FiAlertTriangle, FiCalendar, FiCheckCircle, FiClock, FiLink, FiPause, FiPlay, FiRotateCcw, FiZap } from 'react-icons/fi'

const SCENE_MS = 5000
const TICK_MS = 100

const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` })
const withVar = (vars: Record<string, string>, extra?: CSSProperties) => ({ ...vars, ...extra }) as CSSProperties

const surface: CSSProperties = { backgroundColor: 'var(--surface)' }

/* ---------- Scenes ---------- */

function PasteScene() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <p className="animate-fade-up text-xs font-medium text-slate-500">Add playlist</p>
      <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5" style={surface}>
        <FiLink className="size-4 shrink-0 text-slate-400" />
        <span
          className="animate-type block overflow-hidden whitespace-nowrap font-mono text-xs text-slate-700 sm:text-sm"
          style={withVar({ '--w': '32ch' }, delay(0.4))}
        >
          youtube.com/playlist?list=PL9x2k
        </span>
        <span className="animate-caret h-4 w-px bg-indigo-500" />
      </div>
      <span className="btn-primary btn-sm animate-pop" style={delay(2.6)}>
        Create plan
      </span>
    </div>
  )
}

function DeadlineScene() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-3">
      <div className="animate-pop flex items-center gap-3 rounded-xl border border-slate-200 p-3" style={surface}>
        <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-white">
          <FiPlay className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">Backend from first principles</p>
          <p className="text-xs text-slate-500">31 videos · 34h</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="animate-fade-up rounded-xl border border-slate-200 p-3" style={{ ...surface, ...delay(0.7) }}>
          <p className="text-[11px] text-slate-500">Finish by</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <FiCalendar className="size-4 text-indigo-600" /> 30 Oct
          </p>
        </div>
        <div className="animate-fade-up rounded-xl border border-slate-200 p-3" style={{ ...surface, ...delay(1.1) }}>
          <p className="text-[11px] text-slate-500">Priority</p>
          <div className="mt-1.5 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`animate-pop flex size-6 items-center justify-center rounded-md text-[11px] font-medium ${
                  n === 4 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
                style={delay(1.4 + n * 0.12)}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const PLAN_DAYS: [string, number, string][] = [
  ['Mon', 2, '52m'],
  ['Tue', 3, '58m'],
  ['Wed', 2, '60m'],
  ['Thu', 3, '55m'],
  ['Fri', 1, '34m'],
]

function PlanScene() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-2">
      <div className="animate-fade-up mb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Your plan</p>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600">On track</span>
      </div>
      {PLAN_DAYS.map(([day, count, time], i) => (
        <div
          key={day}
          className="animate-fade-up flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
          style={{ ...surface, ...delay(0.3 + i * 0.35) }}
        >
          <span className="w-8 text-xs font-medium text-slate-500">{day}</span>
          <div className="flex flex-1 gap-1.5">
            {Array.from({ length: count }, (_, k) => (
              <span
                key={k}
                className="animate-pop h-3 flex-1 rounded bg-indigo-500/80"
                style={delay(0.5 + i * 0.35 + k * 0.1)}
              />
            ))}
            {Array.from({ length: 3 - count }, (_, k) => (
              <span key={`e${k}`} className="h-3 flex-1 rounded bg-slate-100" />
            ))}
          </div>
          <span className="w-9 text-right text-xs text-slate-600">{time}</span>
        </div>
      ))}
    </div>
  )
}

const CHECK_ITEMS = [
  { title: 'Roadmap for backend', time: '31m' },
  { title: 'Walk the path of a backend engineer', time: '4m' },
  { title: 'What is a backend?', time: '19m' },
]

function CheckScene() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-3">
      <div className="animate-fade-up rounded-xl border border-slate-200 p-3" style={surface}>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-slate-500">Today's progress</span>
          <span className="flex items-center gap-1 font-medium text-amber-700">
            <FiZap className="animate-pop size-3.5" style={delay(3.4)} />
            <span className="animate-pop" style={delay(3.4)}>4 day streak</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="animate-fill h-full rounded-full bg-indigo-500"
            style={withVar({ '--to': '100%' }, { animationDuration: '3.2s', animationDelay: '0.9s' })}
          />
        </div>
      </div>
      {CHECK_ITEMS.map((item, i) => {
        const at = 1.2 + i * 1.1
        return (
          <div
            key={item.title}
            className="animate-fade-up flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
            style={{ ...surface, ...delay(0.2 + i * 0.15) }}
          >
            <span className="animate-check flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300" style={delay(at)}>
              <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10.5l4 4 8-9" strokeDasharray={24} strokeDashoffset={24} className="animate-tick" style={delay(at + 0.1)} />
              </svg>
            </span>
            <span className="animate-dim min-w-0 flex-1 truncate text-sm font-medium text-slate-800" style={delay(at + 0.2)}>
              {item.title}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <FiClock className="size-3" />
              {item.time}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function BehindScene() {
  const options = ['Spread it out', 'Study more', 'Extend deadline']
  return (
    <div className="mx-auto grid h-full max-w-md content-center">
      <div className="col-start-1 row-start-1">
        <div className="animate-fade-up animate-fade-out rounded-xl border border-amber-200 bg-amber-50 p-3.5" style={{ animationDelay: '0.2s, 3.4s', animationName: 'fade-up, fade-out' }}>
          <div className="flex items-center gap-2.5">
            <FiAlertTriangle className="size-5 shrink-0 text-amber-600" />
            <p className="text-sm font-semibold text-amber-900">2 videos behind schedule</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {options.map((o, i) => (
              <span
                key={o}
                className={`rounded-lg border px-2 py-2 text-center text-[11px] font-medium transition ${
                  i === 0 ? 'animate-pop border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-amber-200 text-slate-600'
                }`}
                style={{ ...(i === 0 ? delay(2) : {}), ...(i !== 0 ? surface : {}) }}
              >
                {o}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="animate-pop col-start-1 row-start-1" style={delay(3.8)}>
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
          <FiCheckCircle className="size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-700">Plan updated</p>
            <p className="text-xs text-emerald-700/80">Back on track for your deadline</p>
          </div>
          <FiRotateCcw className="ml-auto size-4 text-emerald-600" />
        </div>
      </div>
    </div>
  )
}

const BUDDIES = [
  { name: 'You', initial: 'S', percent: '72%', streak: 6, time: '45m today' },
  { name: 'Priya', initial: 'P', percent: '64%', streak: 4, time: '30m today' },
  { name: 'Arjun', initial: 'A', percent: '48%', streak: 2, time: 'Not yet' },
]

function BuddiesScene() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-2.5">
      {BUDDIES.map((b, i) => (
        <div
          key={b.name}
          className="animate-fade-up rounded-xl border border-slate-200 p-3"
          style={{ ...surface, ...delay(0.2 + i * 0.3) }}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
              {b.initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{b.name}</p>
              <p className="text-[11px] text-slate-500">{b.time}</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              <FiZap className="size-3" /> {b.streak}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="animate-fill h-full rounded-full bg-indigo-500"
              style={withVar({ '--to': b.percent }, { animationDelay: `${0.7 + i * 0.3}s`, animationDuration: '2s' })}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- Player ---------- */

const SCENES: { title: string; text: string; view: () => ReactNode }[] = [
  { title: 'Paste a playlist link', text: 'Any public YouTube playlist works.', view: () => <PasteScene /> },
  { title: 'Set a deadline and priority', text: 'Tell us when you want to be done.', view: () => <DeadlineScene /> },
  { title: 'Get a daily plan', text: 'Videos are packed into your study time each day.', view: () => <PlanScene /> },
  { title: 'Check off as you learn', text: 'Progress, streaks and hours update instantly.', view: () => <CheckScene /> },
  { title: 'Fell behind? Re-plan in a tap', text: 'Spread it out, study more, or extend the deadline.', view: () => <BehindScene /> },
  { title: 'Learn with study buddies', text: 'Friends see each other’s streaks and progress.', view: () => <BuddiesScene /> },
]

export function ExplainerVideo() {
  const [scene, setScene] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [inView, setInView] = useState(false)
  // People who prefer reduced motion get to press play themselves.
  const [userPaused, setUserPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const frameRef = useRef<HTMLDivElement>(null)

  const playing = inView && !userPaused

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setElapsed((e) => e + TICK_MS)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [playing])

  // Advance to the next scene once the current one has played out.
  if (elapsed >= SCENE_MS) {
    setElapsed(0)
    setScene((s) => (s + 1) % SCENES.length)
  }

  const goTo = (index: number) => {
    setScene(index)
    setElapsed(0)
  }

  const current = SCENES[scene]

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        ref={frameRef}
        className={`overflow-hidden rounded-2xl border border-slate-200/80 shadow-xl shadow-indigo-500/10 ${playing ? '' : 'explainer-paused'}`}
        style={surface}
      >
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/80" />
            <span className="size-2.5 rounded-full bg-amber-400/80" />
            <span className="size-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="mx-auto rounded-md bg-slate-100 px-3 py-0.5 text-[11px] text-slate-500">shayuflow</span>
          <span className="w-10" />
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setUserPaused((p) => !p)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setUserPaused((p) => !p)
            }
          }}
          aria-label={userPaused ? 'Play walkthrough' : 'Pause walkthrough'}
          className="relative block aspect-[4/3] w-full cursor-pointer select-none overflow-hidden bg-slate-50 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 sm:aspect-video sm:p-6"
        >
          <div key={scene} className="h-full">
            {current.view()}
          </div>
          {userPaused && (
            <span className="animate-fade-in absolute inset-0 flex items-center justify-center bg-slate-900/25">
              <span className="flex size-14 items-center justify-center rounded-full bg-white text-indigo-600 shadow-lg">
                <FiPlay className="size-6 translate-x-0.5" />
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-200/80 px-4 py-3">
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? 'Play' : 'Pause'}
            className="btn-ghost !p-2"
          >
            {userPaused ? <FiPlay className="size-4" /> : <FiPause className="size-4" />}
          </button>
          <div className="flex flex-1 gap-1.5" role="tablist" aria-label="Walkthrough steps">
            {SCENES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                role="tab"
                aria-selected={i === scene}
                aria-label={`Step ${i + 1}: ${s.title}`}
                title={s.title}
                onClick={() => goTo(i)}
                className="group flex-1 py-2"
              >
                <span className="block h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <span
                    className="block h-full rounded-full bg-indigo-500 transition-[width] ease-linear"
                    style={{
                      width: i < scene ? '100%' : i === scene ? `${(elapsed / SCENE_MS) * 100}%` : '0%',
                      transitionDuration: i === scene ? `${TICK_MS}ms` : '0ms',
                    }}
                  />
                </span>
              </button>
            ))}
          </div>
          <span className="w-9 text-right text-xs tabular-nums text-slate-500">
            {scene + 1}/{SCENES.length}
          </span>
        </div>
      </div>

      <div className="mt-5 text-center" aria-live="polite">
        <p className="text-base font-semibold text-slate-900 sm:text-lg">
          <span className="mr-2 text-indigo-600">{scene + 1}.</span>
          {current.title}
        </p>
        <p className="mt-1 text-sm text-slate-500">{current.text}</p>
      </div>
    </div>
  )
}
