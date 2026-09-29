import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { api, TOKEN_KEY } from '../lib/api'
import type { User } from '../lib/types'

interface AuthState {
  user: User | undefined
  isLoading: boolean
  isAuthed: boolean
  signIn: (token: string) => void
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<{ user: User }>('/users/me')).data.user,
    enabled: !!token,
  })

  const signIn = useCallback(
    (t: string) => {
      localStorage.setItem(TOKEN_KEY, t)
      qc.clear()
      setToken(t)
    },
    [qc],
  )

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    qc.clear()
    setToken(null)
  }, [qc])

  const value = useMemo(
    () => ({ user, isLoading: !!token && isLoading, isAuthed: !!token, signIn, signOut }),
    [user, token, isLoading, signIn, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
