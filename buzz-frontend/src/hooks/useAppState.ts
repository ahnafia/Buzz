import { useState } from 'react'

export type AppScreen = 'loading' | 'main' | 'profile'

export const useAppState = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('loading')
  const [isLoading, setIsLoading] = useState(true)

  // Simulate loading process
  const finishLoading = () => {
    setIsLoading(false)
    setCurrentScreen('main')
  }

  const navigateToProfile = () => {
    setCurrentScreen('profile')
  }

  const navigateToMain = () => {
    setCurrentScreen('main')
  }

  const showLoading = () => {
    setCurrentScreen('loading')
    setIsLoading(true)
  }

  return {
    currentScreen,
    isLoading,
    finishLoading,
    navigateToProfile,
    navigateToMain,
    showLoading
  }
}