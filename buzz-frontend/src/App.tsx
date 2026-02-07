import { useEffect } from 'react'
import './App.css'
import LoadingScreen from './screens/LoadingScreen'
import MainMapScreen from './screens/MainMapScreen'
import ProfileScreen from './screens/ProfileScreen'
import { useAppState } from './hooks/useAppState'

function App() {
  const { currentScreen, finishLoading } = useAppState()

  // Simulate loading time
  useEffect(() => {
    const timer = setTimeout(() => {
      finishLoading()
    }, 3000) // 3 second loading screen

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
