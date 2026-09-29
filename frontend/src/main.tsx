import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { errorMessage } from './lib/api.ts'
import './index.css'

// An expired session redirects to login on its own, so it doesn't need a toast.
const isUnauthorized = (err: unknown) => axios.isAxiosError(err) && err.response?.status === 401

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) => {
      if (!isUnauthorized(err)) toast.error(errorMessage(err), { toastId: `q-${query.queryHash}` })
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      if (!isUnauthorized(err)) toast.error(errorMessage(err))
    },
  }),
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 15_000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <ToastContainer position="top-right" autoClose={3500} limit={3} hideProgressBar closeOnClick pauseOnHover theme="light" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
