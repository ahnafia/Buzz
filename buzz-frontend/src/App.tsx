import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import LoadingScreen from './screens/LoadingScreen'
import MainMapScreen from './screens/MainMapScreen'
import ProfileScreen from './screens/ProfileScreen'
import ProfileViewer from './screens/ProfileViewer'
import CreateEventScreen from './screens/CreateEventScreen'
import EditEventScreen from './screens/EditEventScreen'
import MakeFlagScreen from './screens/MakeFlagScreen'
import InfoScreen from './screens/InfoScreen'
import LoginScreen from './screens/LoginScreen'
import ProtectedRoute from './components/ProtectedRoute'
import { useAppState } from './hooks/useAppState'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { UserProvider } from './contexts/UserContext'

function AppContent() {
  const { currentScreen, finishLoading } = useAppState()
  const { user, loading } = useAuth()

  // Simulate loading time
  useEffect(() => {
    const timer = setTimeout(() => {
      finishLoading()
    }, 3000) // 3 second loading screen

    return () => clearTimeout(timer)
  }, [finishLoading])

  // Show loading screen while auth is loading
  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      <Route 
        path="/Profile" 
        element={
          <ProtectedRoute>
            <ProfileScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile-viewer/:username" 
        element={
          <ProtectedRoute>
            <ProfileViewer />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/create-event" 
        element={
          <ProtectedRoute>
            <CreateEventScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/edit-event/:eventId" 
        element={
          <ProtectedRoute>
            <EditEventScreen />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/make_flag" 
        element={
          <ProtectedRoute>
            <MakeFlagScreen />
          </ProtectedRoute>
        } 
      />
      <Route path="/info" element={<InfoScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route
        path="/*"
        element={
          currentScreen === 'loading' ? (
            <LoadingScreen />
          ) : user ? (
            <MainMapScreen />
          ) : (
            <LoginScreen />
          )
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </AuthProvider>
  )
}

export default App
