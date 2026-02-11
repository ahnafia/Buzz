import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const useAuthRedirect = (redirectTo: string = '/login') => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo)
    }
  }, [user, loading, navigate, redirectTo])

  return { user, loading, isAuthenticated: !!user }
}