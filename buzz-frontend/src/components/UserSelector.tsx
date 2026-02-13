import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'
import ProfileImage from './ProfileImage'
import './UserSelector.css'

type User = {
    id: string
    username: string
    displayName: string
    userType: string
    businessName?: string
    profileImageUrl?: string
}

const UserSelector = () => {
    const { currentUserId, setCurrentUserId, currentUsername, setCurrentUsername, backendUser, syncingUser } = useUser()
    const { user: authUser } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch users when component mounts
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true)
            try {
                const allUsers = await api.getAllUsers()
                setUsers(allUsers || [])
            } catch (error) {
                console.error('Error fetching users:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [])

    const handleUserSelect = (user: User) => {
        setCurrentUserId(user.id)
        setCurrentUsername(user.username)
        setIsOpen(false)
    }

    const currentUser = users.find(u => u.username === currentUsername) || backendUser

    const getUserDisplayName = (user: User) => {
        if (user.userType === 'BUSINESS' && user.businessName) {
            return `${user.businessName} (Business)`
        }
        return user.displayName
    }

    // If user is authenticated, show their info
    if (authUser && currentUsername) {
        return (
            <div className="user-selector">
                <button
                    className="user-selector-button authenticated"
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={loading || syncingUser}
                >
                    {syncingUser 
                        ? 'Syncing user...' 
                        : currentUser 
                            ? `Logged in as: ${getUserDisplayName(currentUser)}` 
                            : `Logged in as: ${currentUsername}`
                    }
                </button>

                {isOpen && !loading && !syncingUser && (
                    <>
                        <div className="user-selector-backdrop" onClick={() => setIsOpen(false)} />
                        <div className="user-selector-menu">
                            <div className="user-selector-section">
                                <div className="user-selector-section-title">Current User</div>
                                <div className="user-selector-item active authenticated-user">
                                    <ProfileImage 
                                        src={currentUser?.profileImageUrl} 
                                        alt={`${currentUser?.displayName || currentUsername} profile`}
                                        size="small"
                                    />
                                    <span>
                                        {currentUser 
                                            ? `${getUserDisplayName(currentUser)} (@${currentUser.username})`
                                            : `${currentUsername} (You)`
                                        }
                                    </span>
                                </div>
                            </div>
                            
                            {users.length > 0 && (
                                <div className="user-selector-section">
                                    <div className="user-selector-section-title">Switch to Other User</div>
                                    {users
                                        .filter(u => u.username !== currentUsername)
                                        .map((user) => (
                                            <button
                                                key={user.id}
                                                className="user-selector-item"
                                                onClick={() => handleUserSelect(user)}
                                            >
                                                <ProfileImage 
                                                    src={user.profileImageUrl} 
                                                    alt={`${user.displayName} profile`}
                                                    size="small"
                                                />
                                                <span>{getUserDisplayName(user)} (@{user.username})</span>
                                            </button>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        )
    }

    // Fallback for non-authenticated users (original behavior)
    return (
        <div className="user-selector">
            <button
                className="user-selector-button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
            >
                {loading 
                    ? 'Loading users...' 
                    : currentUser 
                        ? `Logged in as: ${getUserDisplayName(currentUser)}` 
                        : 'Select User'
                }
            </button>

            {isOpen && !loading && (
                <>
                    <div className="user-selector-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="user-selector-menu">
                        {users.length === 0 ? (
                            <div className="user-selector-item disabled">No users found</div>
                        ) : (
                            users.map((user) => (
                                <button
                                    key={user.id}
                                    className={`user-selector-item ${currentUsername === user.username ? 'active' : ''}`}
                                    onClick={() => handleUserSelect(user)}
                                >
                                    <ProfileImage 
                                        src={user.profileImageUrl} 
                                        alt={`${user.displayName} profile`}
                                        size="small"
                                    />
                                    <span>{getUserDisplayName(user)} (@{user.username})</span>
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default UserSelector