// API Types
export interface UserProfile {
  id: string
  username: string
  displayName: string
  bio?: string
  profileImageUrl?: string
  userType: 'PERSONAL' | 'BUSINESS' | 'PROMOTER' | 'ARTIST'
  lat?: number
  lon?: number
  city?: string
  addressText?: string  // Human-readable address for display
  businessName?: string
  businessCategory?: string
  followerCount: number
  followingCount: number
  eventCount: number
  landmarkCount: number
  flagCount: number
  totalLikesGiven: number
  verified: boolean
  createdAt: string
  landmarks: Landmark[]
  recentFlags: Flag[]
  flagsWithLikeCounts: FlagWithLikeCount[]
}

export interface Event {
  id: string
  title: string
  category: string
  startTime: string
  expiresAt: string
  owner: string
  lat: number
  lon: number
  description?: string
  imagePath?: string
}

export interface EventsResponse {
  events: Event[]
  nextCursor?: string
  hasMore: boolean
}

export interface CreateEventRequest {
  title: string
  category: string
  lat: number
  lon: number
  startTime: string
  endTime?: string  // optional - if not provided, backend will use startTime + 24 hours
  description?: string
  imagePath?: string
}

export interface UpdateEventRequest {
  title?: string
  category?: string
  lat?: number
  lon?: number
  startTime?: string
  endTime?: string
  description?: string
  imagePath?: string
}

export interface Landmark {
  id: string
  userId: string
  name: string
  description?: string
  lat: number
  lon: number
  city?: string
  addressText?: string  // Human-readable address for display
  category: string
  visitCount: number
  lastVisitedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Flag {
  id: string
  userId: string
  title: string
  description?: string
  lat: number
  lon: number
  city?: string
  addressText?: string  // Human-readable address for display
  category: string
  imageUrl?: string
  isPublic: boolean
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface FlagWithLikeCount {
  flag: Flag
  likeCount: number
  isLikedByCurrentUser: boolean
}

export interface Friend {
  id: string
  username: string
  displayName: string
  profileImageUrl?: string
}

export interface UsersResponse {
  users: Friend[]
  nextCursor?: string
  hasMore: boolean
}