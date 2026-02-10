import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import type { UserProfile, UsersResponse, Event, EventsResponse, CreateEventRequest, UpdateEventRequest } from '../types/api'

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

export const useBusinessEvents = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const eventsData = await api.getMyEvents('active')
      setEvents(eventsData?.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  const createEvent = async (eventData: CreateEventRequest): Promise<Event> => {
    try {
      const newEvent = await api.createEvent(eventData)
      setEvents(prev => [newEvent, ...prev])
      return newEvent
    } catch (err) {
      throw err
    }
  }

  const updateEvent = async (eventId: string, eventData: UpdateEventRequest): Promise<Event> => {
    try {
      const updatedEvent = await api.updateEvent(eventId, eventData)
      setEvents(prev => prev.map(event => 
        event.id === eventId ? updatedEvent : event
      ))
      return updatedEvent
    } catch (err) {
      throw err
    }
  }

  const deleteEvent = async (eventId: string): Promise<boolean> => {
    try {
      console.log('Attempting to delete event:', eventId)
      const result = await api.deleteEvent(eventId)
      console.log('Delete result:', result)
      setEvents(prev => prev.filter(event => event.id !== eventId))
      return true
    } catch (err) {
      console.error('Delete event error:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  return { 
    events, 
    loading, 
    error, 
    refetch: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent
  }
}