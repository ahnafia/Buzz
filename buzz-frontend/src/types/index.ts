// Core types for the map-based social network

export interface User {
  id: string
  username: string
  displayName: string
  avatar?: string
  location?: Location
}

export interface Location {
  lat: number
  lng: number
  address?: string
  placeName?: string
}

export interface Post {
  id: string
  userId: string
  content: string
  location: Location
  timestamp: Date
  likes: number
  comments: Comment[]
  media?: MediaItem[]
}

export interface Comment {
  id: string
  userId: string
  content: string
  timestamp: Date
}

export interface MediaItem {
  id: string
  type: 'image' | 'video'
  url: string
  thumbnail?: string
}

export interface Place {
  id: string
  name: string
  location: Location
  category: string
  rating?: number
  posts: Post[]
}