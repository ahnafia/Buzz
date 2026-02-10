// API utility functions - backend integration
import type { UserProfile, UsersResponse, Event, EventsResponse, CreateEventRequest, UpdateEventRequest } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

// Helper function to get current user ID (you might want to implement proper auth later)
const getCurrentUserId = (): string | null => {
  // For now, return a mock user ID - in a real app this would come from auth
  return localStorage.getItem('currentUserId')
}

export const api = {
  // Posts
  getPosts: async (location?: { lat: number; lng: number; radius?: number }) => {
    // TODO: Implement API call using API_BASE_URL
    console.log('Getting posts for location:', location, 'base:', API_BASE_URL)
    // Placeholder data
    return []
  },

  createPost: async (postData: any) => {
    // TODO: Implement API call
    console.log('Creating post:', postData)
    return { id: 'temp-id', ...postData }
  },

  // Users
  getUser: async (userId: string) => {
    // TODO: Implement API call
    console.log('Getting user:', userId)
    return null
  },

  // Profile API calls
  getCurrentUserProfile: async (): Promise<UserProfile | null> => {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) return null

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'X-User-Id': currentUserId,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching current user profile:', error)
      return null
    }
  },

  getEnhancedProfile: async (username: string): Promise<UserProfile | null> => {
    try {
      const currentUserId = getCurrentUserId()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (currentUserId) {
        headers['X-User-Id'] = currentUserId
      }

      const response = await fetch(`${API_BASE_URL}/users/${username}/profile`, {
        headers
      })
      console.log(headers)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching enhanced profile:', error)
      return null
    }
  },

  getFriends: async (username: string, cursor?: string, limit: number = 20): Promise<UsersResponse | null> => {
    try {
      const params = new URLSearchParams({ limit: limit.toString() })
      if (cursor) params.append('cursor', cursor)

      const response = await fetch(`${API_BASE_URL}/users/${username}/friends?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching friends:', error)
      return null
    }
  },

  // Events
  getMyEvents: async (status: string = 'active', cursor?: string, limit: number = 20): Promise<EventsResponse | null> => {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) return null

      const params = new URLSearchParams({ 
        status,
        limit: limit.toString() 
      })
      if (cursor) params.append('cursor', cursor)

      const response = await fetch(`${API_BASE_URL}/events/mine?${params}`, {
        headers: {
          'X-User-Id': currentUserId,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching my events:', error)
      return null
    }
  },

  createEvent: async (eventData: CreateEventRequest): Promise<Event> => {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) throw new Error('No user ID available')

      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'X-User-Id': currentUserId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  },

  updateEvent: async (eventId: string, eventData: UpdateEventRequest): Promise<Event> => {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) throw new Error('No user ID available')

      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'X-User-Id': currentUserId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    }
  },

  deleteEvent: async (eventId: string): Promise<boolean> => {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) throw new Error('No user ID available')

      console.log('Deleting event:', eventId, 'with user ID:', currentUserId)

      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': currentUserId,
          'Content-Type': 'application/json'
        }
      })

      console.log('Delete response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Delete error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  },

  // Places
  searchPlaces: async (query: string, location?: { lat: number; lng: number }) => {
    // TODO: Implement API call
    console.log('Searching places:', query, location)
    return []
  },
}

// Re-export types for convenience
export type { 
  UserProfile, 
  UsersResponse, 
  Landmark, 
  Flag, 
  FlagWithLikeCount, 
  Friend,
  Event,
  EventsResponse,
  CreateEventRequest,
  UpdateEventRequest
} from '../types/api'