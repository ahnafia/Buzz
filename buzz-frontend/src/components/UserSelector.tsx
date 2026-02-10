import { useState, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { api } from '../utils/api'
import './UserSelector.css'

type User = {
    id: string
    username: string
    displayName: string
    userType: string
    businessName?: string
}

const UserSelector = () => {
    const { currentUserId, setCurrentUserId, currentUsername, setCurrentUsername } = useUser()
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

    const currentUser = users.find(u => u.username === currentUsername)

    const getUserDisplayName = (user: User) => {
        if (user.userType === 'BUSINESS' && user.businessName) {
            return `${user.businessName} (Business)`
        }
        return user.displayName
    }

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
                                    {getUserDisplayName(user)} (@{user.username})
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