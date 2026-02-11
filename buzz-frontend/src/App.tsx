import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import LoadingScreen from './screens/LoadingScreen'
import MainMapScreen from './screens/MainMapScreen'
import ProfileScreen from './screens/ProfileScreen'
import CreateEventScreen from './screens/CreateEventScreen'
import EditEventScreen from './screens/EditEventScreen'
import InfoScreen from './screens/InfoScreen'
import LoginScreen from './screens/LoginScreen'
import { useAppState } from './hooks/useAppState'
import { UserProvider } from './contexts/UserContext'

function App() {
  const { currentScreen, finishLoading } = useAppState()

  // Simulate loading time
  useEffect(() => {
    const timer = setTimeout(() => {
      finishLoading()
    }, 3000) // 3 second loading screen

    return () => clearTimeout(timer)
  }, [finishLoading])

  return (
    <UserProvider>
      <Routes>
        <Route path="/Profile" element={<ProfileScreen />} />
        <Route path="/create-event" element={<CreateEventScreen />} />
        <Route path="/edit-event/:eventId" element={<EditEventScreen />} />
        <Route path="/info" element={<InfoScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/*"
          element={
            currentScreen === 'loading' ? (
              <LoadingScreen />
            ) : (
              <MainMapScreen />
            )
          }
        />
      </Routes>
    </UserProvider>
  )
}

export default App
