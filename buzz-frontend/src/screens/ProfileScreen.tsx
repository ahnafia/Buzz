import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useProfile, useFriends } from '../hooks/useProfile'
import { useUser } from '../contexts/UserContext'
import UserSelector from '../components/UserSelector'
import './ProfileScreen.css'

const ProfileAvatar = () => (
  <div className="list-item-avatar">
    <svg viewBox="0 0 100 100" fill="none" stroke="#FF9B56" strokeWidth="2" strokeLinecap="round">
      <circle cx="50" cy="40" r="22" />
      <path d="M 15 98 Q 50 45 85 98" />
    </svg>
  </div>
)

const SETTINGS_OPTIONS = [
  'Account',
  'Notifications',
  'Privacy & Security',
  'Appearance',
  'Help & Support',
  'Log out',
]

const ProfileScreen = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentUsername } = useUser()
  const username = searchParams.get('username') || currentUsername // Get username from URL params or use current user

  // Redirect to main screen if no user is available
  useEffect(() => {
    if (!username) {
      navigate('/')
    }
  }, [username, navigate])

  const { profile, loading, error } = useProfile(username || undefined)
  const { friends } = useFriends(profile?.username || '')

  const [activeTab, setActiveTab] = useState<'flag' | 'friends' | 'likes' | null>('flag')
  const [pressedItem, setPressedItem] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Don't render anything if no username (will redirect)
  if (!username) {
    return null
  }

  if (loading) {
    return (
      <div className="profile-screen">
        <div className="profile-header">
          <Link to="/" className="back-btn">← Back</Link>
          <div className="profile-title-row">
            <h1>Loading...</h1>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="profile-screen">
        <div className="profile-header">
          <Link to="/" className="back-btn">← Back</Link>
          <div className="profile-title-row">
            <h1>Profile Not Found</h1>
          </div>
        </div>
        <div className="profile-body">
          <p>Unable to load profile. {error}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="profile-screen">
      <div className="profile-header">
        <Link to="/" className="back-btn">← Back</Link>
        <div className="profile-title-row">
          <button
            type="button"
            className="profile-icon-btn"
            aria-label="Profile icon"
            onClick={(e) => e.stopPropagation()}
          >
            <img src="/IMG_0203.svg" alt="" className="profile-header-icon" />
          </button>
          <h1>Profile</h1>
        </div>
        <div className="profile-header-right">
          <UserSelector />
          <div className="settings-wrapper">
            <button
              type="button"
              className="settings-btn"
              onClick={(e) => {
                e.stopPropagation()
                setSettingsOpen(!settingsOpen)
              }}
              aria-label="Settings"
              aria-expanded={settingsOpen}
            >
              <svg viewBox="0 0 24 24" fill="#FF9B56" width="24" height="24">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </button>
            {settingsOpen && (
              <>
                <div
                  className="settings-backdrop"
                  onClick={() => setSettingsOpen(false)}
                  aria-hidden
                />
                <div className="settings-menu">
                  {SETTINGS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="settings-menu-item"
                      onClick={() => setSettingsOpen(false)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="profile-body">
        {/* Left: Circle, meta, Landmarks */}
        <div className="profile-info-section">
          <div className="profile-avatar-row">
            <div className="profile-circle">
              <svg
                className="profile-silhouette"
                viewBox="0 0 100 100"
                fill="none"
                stroke="#FF9B56"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="50" cy="40" r="22" />
                <path d="M 15 98 Q 50 45 85 98" />
              </svg>
            </div>
            <div className="profile-meta">
              <div className="profile-underline name-box">{profile.displayName}</div>
              <div className="profile-underline city-box">{profile.city || 'Location not set'}</div>
              <div className="profile-underline friends-box">{friends?.users.length || 0} {friends?.users?.length === 1 ? 'Friend' : 'Friends'}</div>
            </div>
          </div>

          <div className="landmarks-block">
            <div className="profile-underline landmarks-label">Landmarks ({profile.landmarkCount})</div>
            <div className="landmark-names">
              {profile.landmarks.slice(0, 4).map((landmark) => (
                <div key={landmark.id} className="landmark-outline">
                  {landmark.name}
                </div>
              ))}
              {profile.landmarks.length === 0 && (
                <div className="landmark-outline">No landmarks yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Tabs (Flag, Friends, Likes) */}
        <div className="profile-main-section">
          <div className="profile-tabs-row">
            <div className="landmarks-buttons">
              <button
                className={`tab-btn ${activeTab === 'flag' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setActiveTab('flag'); setPressedItem(null); }}
              >
                Flags ({profile.flagCount})
              </button>
              <button
                className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setActiveTab('friends'); setPressedItem(null); }}
              >
                {friends?.users?.length === 1 ? 'Friend' : 'Friends'} ({friends?.users.length || 0})
              </button>
              <button
                className={`tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setActiveTab('likes'); setPressedItem(null); }}
              >
                Likes ({profile.totalLikesGiven})
              </button>
            </div>

            <div className="tab-list-content">
              {activeTab === 'flag' && (
                <div className="tab-list">
                  {profile.recentFlags.length > 0 ? (
                    profile.recentFlags.map((flag) => (
                      <button
                        key={flag.id}
                        type="button"
                        className={`list-item-btn ${pressedItem === flag.id ? 'pressed' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPressedItem(pressedItem === flag.id ? null : flag.id)
                        }}
                      >
                        <span className="list-item-icon flag-icon">
                          <svg viewBox="0 0 24 24" fill="#FF9B56" width="20" height="20">
                            <path d="M5 2v20h2V2H5zm4 2h11l-4 6 4 6H9V4z" />
                          </svg>
                        </span>
                        <div className="list-item-text">
                          <span className="list-item-title">{flag.title}</span>
                          <span className="list-item-location">{flag.city || `${flag.lat}, ${flag.lon}`}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="empty-state">No flags yet</div>
                  )}
                </div>
              )}
              {activeTab === 'friends' && (
                <div className="tab-list">
                  {friends?.users && friends.users.length > 0 ? (
                    friends.users.map((friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        className={`list-item-btn ${pressedItem === friend.id ? 'pressed' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPressedItem(pressedItem === friend.id ? null : friend.id)
                        }}
                      >
                        <ProfileAvatar />
                        <span className="list-item-name">{friend.displayName}</span>
                      </button>
                    ))
                  ) : (
                    <div className="empty-state">No friends yet</div>
                  )}
                </div>
              )}
              {activeTab === 'likes' && (
                <div className="tab-list">
                  {profile.flagsWithLikeCounts.length > 0 ? (
                    profile.flagsWithLikeCounts.map((flagWithLikes) => (
                      <button
                        key={flagWithLikes.flag.id}
                        type="button"
                        className={`list-item-btn ${pressedItem === flagWithLikes.flag.id ? 'pressed' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPressedItem(pressedItem === flagWithLikes.flag.id ? null : flagWithLikes.flag.id)
                        }}
                      >
                        <ProfileAvatar />
                        <div className="list-item-text list-item-text-likes">
                          <span className="list-item-name">{flagWithLikes.likeCount} likes</span>
                          <div className="list-item-details">
                            <span className="list-item-title">{flagWithLikes.flag.title}</span>
                            <span className="list-item-location">{flagWithLikes.flag.city || `${flagWithLikes.flag.lat}, ${flagWithLikes.flag.lon}`}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="empty-state">No liked flags yet</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileScreen
