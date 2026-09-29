import axios from 'axios'

export const TOKEN_KEY = 'pp_token'

export const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // An expired or invalid token on a protected call sends the user back to login.
    const isAuthCall = String(err.config?.url).startsWith('/auth/')
    if (err.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.assign('/login')
    }
    return Promise.reject(err)
  },
)

export const errorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; errors?: { message: string }[] } | undefined
    return data?.errors?.[0]?.message ?? data?.message ?? err.message
  }
  return 'Something went wrong'
}
