// API utility functions - placeholder for backend integration

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api'

export const api = {
  // Posts
  getPosts: async (location?: { lat: number; lng: number; radius?: number }) => {
    // TODO: Implement API call
    console.log('Getting posts for location:', location)
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

  // Places
  searchPlaces: async (query: string, location?: { lat: number; lng: number }) => {
    // TODO: Implement API call
    console.log('Searching places:', query, location)
    return []
  }
}