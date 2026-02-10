import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import './UserSelector.css'

const TEST_USERS = [
    { id: '11111111-1111-1111-1111-111111111111', username: 'ahnaf', displayName: 'Ahnaf' },
    { id: '22222222-2222-2222-2222-222222222222', username: 'sarah', displayName: 'Sarah' },
    { id: '33333333-3333-3333-3333-333333333333', username: 'mike', displayName: 'Mike' },
    { id: '44444444-4444-4444-4444-444444444444', username: 'alphabeta', displayName: 'Alpha Beta' },
    { id: 'bobs_coffee', username: 'bobs_coffee', displayName: 'Bobs Coffee Shop (Business)' }
]

const UserSelector = () => {
    const { currentUserId, setCurrentUserId, currentUsername, setCurrentUsername } = useUser()
    const [isOpen, setIsOpen] = useState(false)

    const handleUserSelect = (user: typeof TEST_USERS[0]) => {
        setCurrentUserId(user.id)
        setCurrentUsername(user.username)
        setIsOpen(false)
    }
    const currentUser = TEST_USERS.find(u => u.username === currentUsername)

    return (
        <div className="user-selector">
            <button
                className="user-selector-button"
                onClick={() => setIsOpen(!isOpen)}
            >
                {currentUser ? `Logged in as: ${currentUser.displayName}` : 'Select Test User'}
            </button>

            {isOpen && (
                <>
                    <div className="user-selector-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="user-selector-menu">
                        {TEST_USERS.map((user) => (
                            <button
                                key={user.id}
                                className={`user-selector-item ${currentUsername === user.username ? 'active' : ''}`}
                                onClick={() => handleUserSelect(user)}
                            >
                                {user.displayName} (@{user.username})
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default UserSelector