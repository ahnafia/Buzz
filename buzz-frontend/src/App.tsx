import { useEffect } from 'react'
import './App.css'
import LoadingScreen from './screens/LoadingScreen'
import MainMapScreen from './screens/MainMapScreen'
import ProfileScreen from './screens/ProfileScreen'
import { useAppState } from './hooks/useAppState'

function App() {
  const { currentScreen, finishLoading } = useAppState()

  // Simulate loading time, then show main map
  useEffect(() => {
    const timer = setTimeout(() => finishLoading(), 3000)
    return () => clearTimeout(timer)
  }, [finishLoading])

  // Render different screens based on current state
  switch (currentScreen) {
    case 'loading':
      return <LoadingScreen />
    case 'profile':
      return <ProfileScreen />
    case 'main':
    default:
      return <MainMapScreen />
  }
}

export default App
