import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { FiCalendar, FiTarget, FiUsers } from 'react-icons/fi'
import { Link, Navigate } from 'react-router-dom'
import { Logo } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

const PITCHES = [
  { icon: FiCalendar, text: 'A day-by-day plan built around your deadlines' },
  { icon: FiTarget, text: 'Catch up in one click when you fall behind' },
  { icon: FiUsers, text: 'Stay on track with study buddies' },
]

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { isAuthed, signIn } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const isRegister = mode === 'register'

  const submit = useMutation({
    mutationFn: async () =>
      (await api.post<{ token: string }>(`/auth/${mode}`, isRegister ? form : { email: form.email, password: form.password }))
        .data,
    onSuccess: (data) => signIn(data.token),
  })

  if (isAuthed) return <Navigate to="/today" replace />

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit.mutate()
  }
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value })

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-indigo-600 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-white/5" />
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative">
          <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">Turn any playlist into a plan you can finish.</h2>
          <ul className="mt-8 space-y-4">
            {PITCHES.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-indigo-100">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <p.icon className="size-[18px]" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <span className="relative text-sm text-indigo-200">Stay in the flow.</span>
      </div>

      <div className="flex items-center justify-center px-5 py-10">
        <div className="animate-fade-up w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-1 text-sm text-slate-500">{isRegister ? 'Start planning your learning.' : 'Log in to continue.'}</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            {isRegister && (
              <div>
                <label className="label" htmlFor="name">Name</label>
                <input id="name" className="input" required autoComplete="name" value={form.name} onChange={set('name')} />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                required
                minLength={isRegister ? 8 : 1}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={form.password}
                onChange={set('password')}
                placeholder={isRegister ? 'At least 8 characters' : undefined}
              />
            </div>
            <button className="btn-primary w-full" disabled={submit.isPending}>
              {submit.isPending ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <Link to={isRegister ? '/login' : '/register'} className="font-medium text-indigo-600 hover:underline">
              {isRegister ? 'Log in' : 'Sign up'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
