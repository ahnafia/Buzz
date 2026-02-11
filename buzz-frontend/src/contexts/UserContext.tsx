import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { api } from '../utils/api'

interface UserContextType {
  currentUserId: string | null
  setCurrentUserId: (userId: string | null) => void
  currentUsername: string | null
  setCurrentUsername: (username: string | null) => void
  backendUser: any | null
  syncingUser: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const { user } = useAuth()
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem('currentUserId')
  })

  const [currentUsername, setCurrentUsername] = useState<string | null>(() => {
    return localStorage.getItem('currentUsername')
  })

  const [backendUser, setBackendUser] = useState<any | null>(null)
  const [syncingUser, setSyncingUser] = useState(false)

  // Sync with authenticated user and backend
  useEffect(() => {
    const syncUserWithBackend = async () => {
      console.log('🔄 syncUserWithBackend called with user:', user)
      
      if (user && user.email) {
        console.log('✅ User authenticated, starting backend sync for:', user.email)
        setSyncingUser(true)
        try {
          // First, check if user exists in backend
          console.log('🔍 Checking if user exists in backend...')
          let existingUser = await api.getUserByEmail(user.email)
          console.log('🔍 Backend user lookup result:', existingUser)
          
          if (!existingUser) {
            console.log('🆕 User not found in backend, checking if we should create...')
            
            // Only create a user if we have a pending username (meaning this is a fresh signup)
            const pendingUsername = localStorage.getItem('pendingUsername')
            console.log('📝 Pending username from localStorage:', pendingUsername)
            
            if (pendingUsername) {
              console.log('✅ Found pending username, proceeding with user creation')
              
              let username = pendingUsername
              
              // Ensure username is valid and unique
              if (username.length < 3) {
                username = user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + '_user'
                console.log('⚠️ Username too short, using fallback:', username)
              }

              const userData = {
                id: user.id,
                email: user.email,
                username: username,
                displayName: username
              }
              
              console.log('📤 Sending user data to backend:', userData)
              existingUser = await api.createOrUpdateUser(userData)
              console.log('✅ Created new user in backend:', existingUser)
              
              // Clean up the pending username after successful creation
              localStorage.removeItem('pendingUsername')
              console.log('🧹 Cleaned up pending username from localStorage after successful user creation')
            } else {
              console.log('⚠️ No pending username found - this appears to be an existing session, not a fresh signup')
              console.log('⚠️ User exists in Supabase but not in backend - this might be a data inconsistency')
              
              // Fallback: create user with email-based username, but log this as unusual
              const fallbackUsername = user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '')
              const userData = {
                id: user.id,
                email: user.email,
                username: fallbackUsername,
                displayName: fallbackUsername
              }
              
              console.log('🔧 Creating user with fallback data due to missing pending username:', userData)
              existingUser = await api.createOrUpdateUser(userData)
            }
          } else {
            console.log('✅ Found existing user in backend:', existingUser)
            
            // Clean up any leftover pending username since user already exists
            const pendingUsername = localStorage.getItem('pendingUsername')
            if (pendingUsername) {
              localStorage.removeItem('pendingUsername')
              console.log('🧹 Cleaned up leftover pending username since user already exists')
            }
          }

          // Update local state with backend user data
          setBackendUser(existingUser)
          setCurrentUserId(existingUser.id)
          setCurrentUsername(existingUser.username)
          console.log('✅ Updated local state with backend user data')
          
        } catch (error) {
          console.error('❌ Error syncing user with backend:', error)
          // Fallback to basic user data from Supabase
          const fallbackUsername = user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '')
          setCurrentUserId(user.id)
          setCurrentUsername(fallbackUsername)
          setBackendUser(null)
          console.log('⚠️ Using fallback user data due to backend sync error')
        } finally {
          setSyncingUser(false)
          console.log('🏁 Backend sync process completed')
        }
      } else {
        console.log('❌ No authenticated user, clearing user state')
        // User logged out
        setCurrentUserId(null)
        setCurrentUsername(null)
        setBackendUser(null)
        setSyncingUser(false)
      }
    }

    syncUserWithBackend()
  }, [user])

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('currentUserId', currentUserId)
    } else {
      localStorage.removeItem('currentUserId')
    }
  }, [currentUserId])

  useEffect(() => {
    if (currentUsername) {
      localStorage.setItem('currentUsername', currentUsername)
    } else {
      localStorage.removeItem('currentUsername')
    }
  }, [currentUsername])

  return (
    <UserContext.Provider value={{
      currentUserId,
      setCurrentUserId,
      currentUsername,
      setCurrentUsername,
      backendUser,
      syncingUser
    }}>
      {children}
    </UserContext.Provider>
  )
}