// API Types
export interface UserProfile {
  id: string
  username: string
  displayName: string
  bio?: string
  profileImageUrl?: string
  userType: 'INDIVIDUAL' | 'BUSINESS'
  lat?: number
  lon?: number
  city?: string
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

export interface Landmark {
  id: string
  name: string
  lat: number
  lon: number
  city?: string
  createdAt: string
}

export interface Flag {
  id: string
  title: string
  description?: string
  lat: number
  lon: number
  city?: string
  createdAt: string
}

export interface FlagWithLikeCount {
  flag: Flag
  likeCount: number
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