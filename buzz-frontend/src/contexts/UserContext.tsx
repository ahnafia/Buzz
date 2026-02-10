import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface UserContextType {
  currentUserId: string | null
  setCurrentUserId: (userId: string | null) => void
  currentUsername: string | null
  setCurrentUsername: (username: string | null) => void
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem('currentUserId')
  })

  const [currentUsername, setCurrentUsername] = useState<string | null>(() => {
    return localStorage.getItem('currentUsername')
  })

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
      setCurrentUsername
    }}>
      {children}
    </UserContext.Provider>
  )
}