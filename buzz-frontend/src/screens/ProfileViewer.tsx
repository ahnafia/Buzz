import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useProfile, useFriends } from '../hooks/useProfile'
import ProfileImage from '../components/ProfileImage'
import type { Friend, Landmark, Flag } from '../types/api'
import './ProfileScreen.css'
import './ProfileViewer.css'

const getFlagFirstImage = (flag: Flag): string | undefined => {
  const raw = flag.imageUrl ?? (flag as { imagePath?: string }).imagePath
  if (!raw) return undefined
  const first = raw.includes(',') ? raw.split(',')[0]?.trim() : raw.trim()
  return first || undefined
}

const ProfileViewer = () => {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { profile, loading, error } = useProfile(username || undefined)
  const { friends } = useFriends(profile?.username || '')

  const [activeTab, setActiveTab] = useState<'flag' | 'friends' | 'replants' | null>('flag')
  const [pressedItem, setPressedItem] = useState<string | null>(null)

  useEffect(() => {
    if (!username) {
      navigate('/')
    }
  }, [username, navigate])

  const goToUser = (targetUsername: string) => {
    navigate(`/profile-viewer/${encodeURIComponent(targetUsername)}`)
    setPressedItem(null)
  }

  if (!username) return null

  if (loading) {
    return (
      <div className="profile-screen profile-viewer-screen">
        <div className="profile-header">
          <Link to="/" className="back-btn">← Back</Link>
          <h1>Loading…</h1>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="profile-screen profile-viewer-screen">
        <div className="profile-header">
          <Link to="/" className="back-btn">← Back</Link>
          <h1>Profile not found</h1>
        </div>
        <div className="profile-body">
          <p>{error || 'Unable to load this profile.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-screen profile-viewer-screen">
      <div className="profile-header">
        <Link to="/" className="back-btn">← Back</Link>
        <div className="profile-title-row">
          <ProfileImage src={profile.profileImageUrl} alt="" size="small" className="profile-header-icon-wrap" />
          <h1>{profile.displayName}</h1>
        </div>
      </div>

      <div className="profile-body">
        {/* Left: Circle, meta, Landmarks (same as ProfileScreen) */}
        <div className="profile-info-section">
          <div className="profile-avatar-row">
            <div className="profile-circle">
              <ProfileImage src={profile.profileImageUrl} alt={`${profile.displayName} profile`} size="large" />
            </div>
            <div className="profile-meta">
              <div className="profile-underline name-box">{profile.displayName}</div>
              <div className="profile-underline city-box">{profile.addressText || profile.city || 'Location not set'}</div>
              <div className="profile-underline friends-box">{friends?.users?.length ?? 0} {friends?.users?.length === 1 ? 'Friend' : 'Friends'}</div>
            </div>
          </div>

          <div className="landmarks-block">
            <div className="profile-underline landmarks-label">Landmarks ({profile.landmarkCount})</div>
            <div className="landmark-names">
              {profile.landmarks.slice(0, 4).map((landmark: Landmark) => (
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

        {/* Right: Flags, Friends, RePlants tabs */}
        <div className="profile-main-section">
          <div className="profile-tabs-row">
            <div className="landmarks-buttons">
              <button
                className={`tab-btn ${activeTab === 'flag' ? 'active' : ''}`}
                onClick={() => { setActiveTab('flag'); setPressedItem(null) }}
              >
                Flags ({profile.flagCount})
              </button>
              <button
                className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={() => { setActiveTab('friends'); setPressedItem(null) }}
              >
                {friends?.users?.length === 1 ? 'Friend' : 'Friends'} ({friends?.users.length ?? 0})
              </button>
              <button
                className={`tab-btn ${activeTab === 'replants' ? 'active' : ''}`}
                onClick={() => { setActiveTab('replants'); setPressedItem(null) }}
              >
                RePlants ({profile.landmarks.length})
              </button>
            </div>

            <div className="tab-list-content">
              {activeTab === 'flag' && (
                <div className="tab-list">
                  {profile.recentFlags.length > 0 ? (
                    profile.recentFlags.map((flag: Flag) => {
                      const flagThumb = getFlagFirstImage(flag)
                      return (
                      <button
                        key={flag.id}
                        type="button"
                        className={`list-item-btn ${pressedItem === flag.id ? 'pressed' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate('/', {
                            state: {
                              findFriendsUsername: profile.username,
                              focusFlag: { id: flag.id, lat: flag.lat, lon: flag.lon }
                            }
                          })
                        }}
                      >
                        <span className="list-item-icon flag-icon">
                          {flagThumb ? (
                            <img src={flagThumb} alt="" className="list-item-flag-thumb" />
                          ) : (
                            <svg viewBox="0 0 24 24" fill="#FF9B56" width="20" height="20">
                              <path d="M5 2v20h2V2H5zm4 2h11l-4 6 4 6H9V4z" />
                            </svg>
                          )}
                        </span>
                        <div className="list-item-text">
                          <span className="list-item-title">{flag.title}</span>
                          <span className="list-item-location">{flag.addressText || flag.city || 'Location not set'}</span>
                        </div>
                      </button>
                    )})
                  ) : (
                    <div className="empty-state">No flags yet</div>
                  )}
                </div>
              )}

              {activeTab === 'friends' && (
                <div className="tab-list">
                  {friends?.users && friends.users.length > 0 ? (
                    friends.users.map((friend: Friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        className={`list-item-btn ${pressedItem === friend.id ? 'pressed' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          goToUser(friend.username)
                        }}
                      >
                        <div className="list-item-avatar">
                          <ProfileImage src={friend.profileImageUrl} alt={`${friend.displayName ?? friend.username} profile`} size="medium" />
                        </div>
                        <span className="list-item-name">{friend.displayName ?? friend.username}</span>
                      </button>
                    ))
                  ) : (
                    <div className="empty-state">No friends yet</div>
                  )}
                </div>
              )}

              {activeTab === 'replants' && (
                <div className="tab-list">
                  {profile.landmarks.length > 0 ? (
                    profile.landmarks.map((landmark: Landmark) => (
                      <button
                        key={landmark.id}
                        type="button"
                        className={`list-item-btn ${pressedItem === landmark.id ? 'pressed' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPressedItem(pressedItem === landmark.id ? null : landmark.id)
                        }}
                      >
                        <span className="list-item-icon flag-icon">
                          <svg viewBox="0 0 24 24" fill="#FF9B56" width="20" height="20">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        </span>
                        <div className="list-item-text">
                          <span className="list-item-title">{landmark.name}</span>
                          <span className="list-item-location">{landmark.addressText || landmark.city || 'Location not set'}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="empty-state">No RePlants yet</div>
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

export default ProfileViewer
