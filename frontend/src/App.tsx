import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './context/AuthContext'
import AddPlaylist from './pages/AddPlaylist'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Friends from './pages/Friends'
import Landing from './pages/Landing'
import Plan from './pages/Plan'
import PlaylistDetail from './pages/PlaylistDetail'
import Playlists from './pages/Playlists'
import Settings from './pages/Settings'
import Summary from './pages/Summary'

function Protected() {
  const { isAuthed } = useAuth()
  return isAuthed ? <Layout /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<Protected />}>
        <Route path="today" element={<Dashboard />} />
        <Route path="playlists" element={<Playlists />} />
        <Route path="playlists/new" element={<AddPlaylist />} />
        <Route path="playlists/:id" element={<PlaylistDetail />} />
        <Route path="plan" element={<Plan />} />
        <Route path="week" element={<Summary />} />
        <Route path="friends" element={<Friends />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
