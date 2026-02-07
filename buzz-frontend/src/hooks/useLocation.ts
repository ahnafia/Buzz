import { useState } from 'react'
import type { Location } from '../types'

export const useLocation = () => {
  const [location, setLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
  }

  return { location, loading, error, getCurrentLocation }
}