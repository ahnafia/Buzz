import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import type { UserProfile, UsersResponse } from '../types/api'

export const useProfile = (username?: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let profileData: UserProfile | null = null
      
      if (username) {
        // Fetch specific user's profile
        profileData = await api.getEnhancedProfile(username)
      } else {
        // Fetch current user's profile
        profileData = await api.getCurrentUserProfile()
      }
      
      setProfile(profileData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [username])

  return { profile, loading, error, refetch: fetchProfile }
}

export const useFriends = (username: string) => {
  const [friends, setFriends] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoading(true)
        setError(null)
        const friendsData = await api.getFriends(username)
        setFriends(friendsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch friends')
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchFriends()
    }
  }, [username])

  return { friends, loading, error }
}