// API utility functions - backend integration
import type { UserProfile, UsersResponse, Event, EventsResponse, CreateEventRequest, UpdateEventRequest, Flag, CreateFlagRequest } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

console.log('🌐 API Configuration:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE
})

// Helper function to get current user ID (you might want to implement proper auth later)
const getCurrentUserId = (): string | null => {
  // For now, return a mock user ID - in a real app this would come from auth
  const userId = localStorage.getItem('currentUserId')
  console.log('🔍 getCurrentUserId called, returning:', userId)
  return userId
}

export const api = {
  // User management
  createOrUpdateUser: async (userData: {
    id: string
    email: string
    username: string
    displayName: string
  }) => {
    console.log('🚀 createOrUpdateUser called with:', userData)
    try {
      // First check if user exists
      console.log('🔍 Checking if user exists by email:', userData.email)
      const existingUser = await api.getUserByEmail(userData.email)
      console.log('🔍 getUserByEmail result:', existingUser)

      if (existingUser) {
        console.log('✅ User already exists')

        // Check if the existing user has a generic email-based username and we have a better one
        const emailUsername = userData.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '')
        if (existingUser.username === emailUsername && userData.username !== emailUsername) {
          console.log('🔄 Existing user has email-based username, updating to preferred username:', userData.username)

          // Check if the new username is available
          const isAvailable = await api.checkUsernameAvailability(userData.username)
          if (isAvailable) {
            // Update the user with the new username
            // Note: You'd need to implement an update endpoint for this
            console.log('✅ New username is available, would update user')
            // For now, just return the existing user
            return existingUser
          } else {
            console.log('⚠️ Preferred username not available, keeping existing username')
          }
        }

        return existingUser // User already exists, return it
      }

      // Create new user with backend expected format
      const createUserData = {
        username: userData.username,
        email: userData.email,
        password: 'supabase-auth-placeholder', // Placeholder since we're using Supabase auth
        displayName: userData.displayName,
        userType: 'PERSONAL' // Default user type
        // Omit businessName and businessCategory for PERSONAL users
      }

      console.log('📤 Creating new user with data:', createUserData)
      console.log('📡 Making POST request to:', `${API_BASE_URL}/users`)

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createUserData)
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Backend error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const newUser = await response.json()
      console.log('✅ Successfully created user in backend:', newUser)
      return newUser
    } catch (error) {
      console.error('❌ Error in createOrUpdateUser:', error)
      throw error
    }
  },

  checkUsernameAvailability: async (username: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/check-username/${encodeURIComponent(username)}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.available
    } catch (error) {
      console.error('Error checking username availability:', error)
      // Return true (available) when we can't check, so signup can proceed
      // The backend will do the final validation during user creation
      return true
    }
  },

  getUserByEmail: async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/by-email/${encodeURIComponent(email)}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null // User not found
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching user by email:', error)
      return null
    }
  },

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

  getAllUsers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/all`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching all users:', error)
      return []
    }
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

  /** Update current user profile (PATCH /users/me). Only provided fields are updated. */
  updateCurrentUserProfile: async (updates: {
    displayName?: string
    bio?: string
    profileImagePath?: string
    lat?: number
    lon?: number
    city?: string
    addressText?: string
    businessName?: string
    businessCategory?: string
    locationVisible?: boolean
    profilePublic?: boolean
  }): Promise<UserProfile | null> => {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) return null

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'X-User-Id': currentUserId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating current user profile:', error)
      throw error
    }
  },

  /** Current user's flags (for map). Tries GET /users/me/flags; if missing, returns null so caller can use profile.recentFlags. */
  getMyFlags: async (): Promise<Flag[] | null> => {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) return null
      const response = await fetch(`${API_BASE_URL}/users/me/flags`, {
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUserId }
      })
      if (!response.ok) return null
      return await response.json()
    } catch {
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

      console.log('API: getEnhancedProfile headers:', headers)

      const response = await fetch(`${API_BASE_URL}/users/${username}/profile`, {
        headers
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const profileData = await response.json()
      console.log('API: getEnhancedProfile response:', profileData)
      console.log('API: profileImageUrl in response:', profileData.profileImageUrl)

      return profileData
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

  searchUsers: async (query: string, limit: number = 20): Promise<UserProfile[]> => {
    try {
      if (!query || !query.trim()) return []
      const params = new URLSearchParams({ q: query.trim(), limit: limit.toString() })
      const response = await fetch(`${API_BASE_URL}/users/search?${params}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  },

  followUser: async (username: string): Promise<void> => {
    const currentUserId = getCurrentUserId()
    if (!currentUserId) throw new Error('Not logged in')
    const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(username)}/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': currentUserId
      }
    })
    if (!response.ok) throw new Error(response.status === 401 ? 'Not logged in' : `Failed to follow user: ${response.status}`)
  },

  getFollowers: async (username: string, cursor?: string, limit: number = 50): Promise<UsersResponse | null> => {
    try {
      const params = new URLSearchParams({ limit: limit.toString() })
      if (cursor) params.append('cursor', cursor)
      const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(username)}/followers?${params}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching followers:', error)
      return null
    }
  },

  getFollowing: async (username: string, cursor?: string, limit: number = 50): Promise<UsersResponse | null> => {
    try {
      const params = new URLSearchParams({ limit: limit.toString() })
      if (cursor) params.append('cursor', cursor)
      const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(username)}/following?${params}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching following:', error)
      return null
    }
  },

  // Events
  getEvents: async (lat: number, lon: number, radiusMiles: number = 5.0, timeWindow?: string, categories?: string[], cursor?: string, limit: number = 20): Promise<EventsResponse | null> => {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        radiusMiles: radiusMiles.toString(),
        limit: limit.toString()
      })

      if (timeWindow) params.append('timeWindow', timeWindow)
      if (categories && categories.length > 0) {
        categories.forEach(cat => params.append('category', cat))
      }
      if (cursor) params.append('cursor', cursor)

      const response = await fetch(`${API_BASE_URL}/events?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching events:', error)
      return null
    }
  },

  getEventPins: async (lat: number, lon: number, radiusMiles: number = 5.0, timeWindow?: string, categories?: string[], limit: number = 20): Promise<Event[] | null> => {
    try {
      // Set date range: now to now + 7 days
      const now = new Date()
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        radiusMiles: radiusMiles.toString(),
        limit: limit.toString(),
        start: now.toISOString(),
        end: endDate.toISOString()
      })

      if (timeWindow) params.append('timeWindow', timeWindow)
      if (categories && categories.length > 0) {
        categories.forEach(cat => params.append('category', cat))
      }

      const response = await fetch(`${API_BASE_URL}/events/pins?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching event pins:', error)
      return null
    }
  },

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

      // First, get the event to retrieve image URLs for cleanup
      const event = await api.getEvent(eventId)
      
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

      // Clean up associated images after successful deletion
      if (event?.imagePath) {
        try {
          const { deleteImages } = await import('./storage')
          await deleteImages([event.imagePath])
          console.log('Successfully cleaned up event image:', event.imagePath)
        } catch (imageError) {
          console.error('Failed to clean up event image:', imageError)
          // Don't fail the entire operation if image cleanup fails
        }
      }

      return true
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  },

  createFlag: async (request: CreateFlagRequest): Promise<Flag> => {
    console.log('🚀 createFlag called with request:', request)
    
    const currentUserId = getCurrentUserId()
    console.log('🔍 Current user ID:', currentUserId)
    
    if (!currentUserId) {
      console.error('❌ No current user ID found')
      throw new Error('Not logged in')
    }

    const requestBody = {
      title: request.title,
      description: request.description ?? null,
      lat: request.lat,
      lon: request.lon,
      city: request.city ?? null,
      addressText: request.addressText ?? null,
      category: request.category ?? null,
      imageUrl: request.imageUrl ?? null,
      imagePaths: request.imagePaths ?? null,
      color: request.color ?? null,
      isPublic: request.isPublic ?? true
    }
    
    console.log('📤 Request body to be sent:', requestBody)
    console.log('📡 Making POST request to:', `${API_BASE_URL}/flags`)
    console.log('📡 Request headers:', {
      'Content-Type': 'application/json',
      'X-User-Id': currentUserId
    })

    const response = await fetch(`${API_BASE_URL}/flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': currentUserId
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log('📡 Response status:', response.status)
    console.log('📡 Response ok:', response.ok)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const text = await response.text()
      console.error('❌ Backend error response:', text)
      console.error('❌ Full response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: text
      })
      throw new Error(response.status === 401 ? 'Not logged in' : `Failed to create flag: ${response.status} ${text}`)
    }
    
    const result = await response.json()
    console.log('✅ Successfully created flag:', result)
    return result
  },

  deleteFlag: async (flagId: string): Promise<boolean> => {
    try {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) throw new Error('No user ID available')

      console.log('Deleting flag:', flagId, 'with user ID:', currentUserId)

      // First, get the flag to retrieve image URLs for cleanup
      // Note: This assumes there's a getFlag endpoint - if not, we'll handle gracefully
      let flag: Flag | null = null
      try {
        const flagResponse = await fetch(`${API_BASE_URL}/flags/${flagId}`, {
          headers: {
            'X-User-Id': currentUserId,
            'Content-Type': 'application/json'
          }
        })
        if (flagResponse.ok) {
          flag = await flagResponse.json()
        }
      } catch (error) {
        console.warn('Could not fetch flag for cleanup:', error)
      }

      const response = await fetch(`${API_BASE_URL}/flags/${flagId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': currentUserId,
          'Content-Type': 'application/json'
        }
      })

      console.log('Delete flag response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Delete flag error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      // Clean up associated images after successful deletion
      if (flag) {
        const imagesToDelete: string[] = []
        
        // Handle legacy imageUrl field
        if (flag.imageUrl) {
          imagesToDelete.push(flag.imageUrl)
        }
        
        // Handle new imagePaths array
        if (flag.imagePaths && flag.imagePaths.length > 0) {
          imagesToDelete.push(...flag.imagePaths)
        }

        if (imagesToDelete.length > 0) {
          try {
            const { deleteImages } = await import('./storage')
            await deleteImages(imagesToDelete)
            console.log('Successfully cleaned up flag images:', imagesToDelete)
          } catch (imageError) {
            console.error('Failed to clean up flag images:', imageError)
            // Don't fail the entire operation if image cleanup fails
          }
        }
      }

      return true
    } catch (error) {
      console.error('Error deleting flag:', error)
      throw error
    }
  },

  getEvent: async (eventId: string): Promise<Event | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching event by ID:', error)
      return null
    }
  },

  getUserById: async (userId: string): Promise<UserProfile | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/id/${userId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching user by ID:', error)
      return null
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
  UpdateEventRequest,
  CreateFlagRequest
} from '../types/api'