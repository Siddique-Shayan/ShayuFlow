import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api, errorMessage } from '../lib/api'

// Minimal typings for the parts of Google Identity Services used here.
interface GoogleId {
  initialize: (config: { client_id: string; callback: (res: { credential: string }) => void; ux_mode?: 'popup' }) => void
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'
let gsiLoader: Promise<GoogleId> | null = null

/** Loads the Google Identity Services script once per page. */
const loadGsi = () =>
  (gsiLoader ??= new Promise<GoogleId>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id)
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('GSI missing')))
    script.onerror = () => {
      gsiLoader = null
      reject(new Error('Could not load Google sign-in'))
    }
    document.head.appendChild(script)
  }))

/** Google's official "Sign up / Continue with Google" button. */
export default function GoogleButton({ mode, clientId }: { mode: 'login' | 'register'; clientId: string }) {
  const { signIn } = useAuth()
  const ref = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState(false)

  const exchange = useMutation({
    mutationFn: async (credential: string) => (await api.post<{ token: string }>('/auth/google', { credential })).data,
    onSuccess: (data) => signIn(data.token),
  })
  // GSI keeps the callback from the first initialize call, so route it through a ref to the latest mutate.
  const exchangeRef = useRef(exchange.mutate)
  useEffect(() => {
    exchangeRef.current = exchange.mutate
  }, [exchange.mutate])

  useEffect(() => {
    let cancelled = false
    loadGsi()
      .then((gsi) => {
        if (cancelled || !ref.current) return
        gsi.initialize({ client_id: clientId, ux_mode: 'popup', callback: (res) => exchangeRef.current(res.credential) })
        const dark = document.documentElement.classList.contains('dark')
        gsi.renderButton(ref.current, {
          type: 'standard',
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: mode === 'register' ? 'signup_with' : 'continue_with',
          logo_alignment: 'center',
          width: Math.min(400, ref.current.offsetWidth || 384),
        })
      })
      .catch(() => !cancelled && setLoadError(true))
    return () => {
      cancelled = true
    }
  }, [clientId, mode])

  return (
    <div className="space-y-2">
      <div ref={ref} className={`flex min-h-[44px] w-full justify-center ${exchange.isPending ? 'pointer-events-none opacity-60' : ''}`} />
      {exchange.isPending && <p className="text-center text-xs text-slate-500">Signing you in…</p>}
      {exchange.isError && <p className="text-center text-sm text-red-600">{errorMessage(exchange.error)}</p>}
      {loadError && <p className="text-center text-sm text-red-600">Could not load Google sign-in. Check your connection or ad blocker.</p>}
    </div>
  )
}
