import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useProfile, useFriends, useBusinessEvents } from '../hooks/useProfile'
import { useUser } from '../contexts/UserContext'
import { useAuth } from '../contexts/AuthContext'
import UserSelector from '../components/UserSelector'
import BusinessMapView from '../components/BusinessMapView'
import ProfileImage from '../components/ProfileImage'
import '../components/BusinessMapView.css'
import { api } from '../utils/api'
import type { Event, UserProfile, Friend, Landmark } from '../types/api'
import './ProfileScreen.css'

// Business Profile Components
const BusinessHeader = ({ profile, hasActiveEvents, onLogoClick }: { profile: any, hasActiveEvents: boolean, onLogoClick?: () => void }) => (
  <div className="business-header" data-has-events={hasActiveEvents}>
    <div className="business-info">
      <div className="business-name-row">
        <h1 className="business-name">{profile.businessName || profile.displayName}</h1>
        {profile.businessCategory && (
          <span className="category-badge">{profile.businessCategory}</span>
        )}
      </div>
      <div className="business-location">{profile.addressText || profile.city || 'Location not set'}</div>
      <div className="business-status">
        <span className="status-indicator">
          {hasActiveEvents ? 'Active events' : 'No active events'}
        </span>
      </div>
    </div>
    {onLogoClick ? (
      <button
        type="button"
        className="business-logo business-logo-clickable"
        onClick={onLogoClick}
        aria-label="Enlarge profile picture"
      >
        <ProfileImage 
          src={profile.profileImageUrl} 
          alt={`${profile.businessName || profile.displayName} logo`}
          size="large"
        />
      </button>
    ) : (
      <div className="business-logo">
        <ProfileImage 
          src={profile.profileImageUrl} 
          alt={`${profile.businessName || profile.displayName} logo`}
          size="large"
        />
      </div>
    )}
  </div>
)

const EventCard = ({ event, onEdit, onDelete, onCopyLink }: { 
  event: Event, 
  onEdit: () => void, 
  onDelete: () => void, 
  onCopyLink: () => void 
}) => {
  const getStatusBadge = (startTime: string, expiresAt: string) => {
    const now = new Date()
    const start = new Date(startTime)
    const expires = new Date(expiresAt)
    
    if (now > expires) return { text: 'Expired', class: 'expired' }
    if (now >= start) return { text: 'Live', class: 'live' }
    return { text: 'Upcoming', class: 'upcoming' }
  }

  const status = getStatusBadge(event.startTime, event.expiresAt)
  
  return (
    <div className="event-card">
      <div className="event-info">
        <h3 className="event-title">{event.title}</h3>
        <div className="event-datetime">
          {new Date(event.startTime).toLocaleDateString()} at {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <p className="event-category">{event.category}</p>
        {event.description && (
          <p className="event-description">{event.description}</p>
        )}
        <span className={`status-badge ${status.class}`}>{status.text}</span>
      </div>
      <div className="event-actions">
        <button onClick={onEdit} className="action-btn edit-btn">Edit</button>
        <button onClick={onDelete} className="action-btn delete-btn">Delete</button>
        <button onClick={onCopyLink} className="action-btn copy-btn">Copy Link</button>
      </div>
    </div>
  )
}

const BusinessSettings = ({ profile, isOpen, onToggle, onSaveSuccess }: { 
  profile: any, 
  isOpen: boolean, 
  onToggle: () => void,
  onSaveSuccess?: () => void | Promise<void>
}) => {
  const [businessName, setBusinessName] = useState(profile.businessName || profile.displayName || '')
  const [businessCategory, setBusinessCategory] = useState(profile.businessCategory || '')
  const [location, setLocation] = useState(profile.addressText || profile.city || '')
  const [contactEmail, setContactEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync local state when profile changes (e.g. after refetch)
  useEffect(() => {
    setBusinessName(profile.businessName || profile.displayName || '')
    setBusinessCategory(profile.businessCategory || '')
    setLocation(profile.addressText || profile.city || '')
  }, [profile.businessName, profile.displayName, profile.businessCategory, profile.addressText, profile.city])

  const handleSave = async () => {
    setSaveError(null)
    setSaving(true)
    try {
      await api.updateCurrentUserProfile({
        businessName: businessName.trim() || undefined,
        businessCategory: businessCategory.trim() || undefined,
        addressText: location.trim() || undefined
      })
      await onSaveSuccess?.()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="business-settings">
      <button className="settings-toggle" onClick={onToggle}>
        Business Settings {isOpen ? '▼' : '▶'}
      </button>
      {isOpen && (
        <div className="settings-content">
          <div className="setting-field">
            <label>Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="setting-field">
            <label>Category</label>
            <input
              type="text"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
            />
          </div>
          <div className="setting-field">
            <label>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="setting-field">
            <label>Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="business@example.com"
            />
          </div>
          {saveError && <div className="settings-save-error" role="alert">{saveError}</div>}
          <button
            type="button"
            className="save-settings-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}

const ProfileAvatar = ({ profileImageUrl, displayName }: { profileImageUrl?: string, displayName?: string }) => (
  <div className="list-item-avatar">
    <ProfileImage 
      src={profileImageUrl} 
      alt={`${displayName || 'User'} profile`}
      size="medium"
    />
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
  const { signOut } = useAuth()
  const username = searchParams.get('username') || currentUsername // Get username from URL params or use current user

  // Redirect to main screen if no user is available
  useEffect(() => {
    if (!username) {
      navigate('/')
    }
  }, [username, navigate])

  const { profile, loading, error, refetch } = useProfile(username || undefined)
  const { friends, refetch: refetchFriends } = useFriends(profile?.username || '')

  const [activeTab, setActiveTab] = useState<'flag' | 'friends' | 'likes' | 'find-friends' | null>('flag')
  const [pressedItem, setPressedItem] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [businessSettingsOpen, setBusinessSettingsOpen] = useState(false)
  const [findFriendsQuery, setFindFriendsQuery] = useState('')
  const [findFriendsResults, setFindFriendsResults] = useState<UserProfile[]>([])
  const [findFriendsLoading, setFindFriendsLoading] = useState(false)
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null)
  const [friendRequests, setFriendRequests] = useState<Friend[]>([])
  const [friendRequestsLoading, setFriendRequestsLoading] = useState(false)
  const [acceptingFriendId, setAcceptingFriendId] = useState<string | null>(null)
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editProfileSaving, setEditProfileSaving] = useState(false)
  const [editProfileError, setEditProfileError] = useState<string | null>(null)
  const [landmarkFormOpen, setLandmarkFormOpen] = useState(false)
  const [editingLandmarkId, setEditingLandmarkId] = useState<string | null>(null)
  const [landmarkFormName, setLandmarkFormName] = useState('')
  const [landmarkSaving, setLandmarkSaving] = useState(false)
  const [landmarkError, setLandmarkError] = useState<string | null>(null)

  // Business events hook - only used for business profiles
  const businessEvents = useBusinessEvents()

  // Mock events for business profile - replace with actual API call
  useEffect(() => {
    if (profile?.userType === 'BUSINESS') {
      // Events are now handled by the useBusinessEvents hook
      businessEvents.refetch()
    }
  }, [profile])

  // Find Friends: search users when query changes (debounced)
  useEffect(() => {
    if (activeTab !== 'find-friends') return
    const q = findFriendsQuery.trim()
    if (!q) {
      setFindFriendsResults([])
      return
    }
    const t = setTimeout(async () => {
      setFindFriendsLoading(true)
      try {
        const users = await api.searchUsers(q, 30)
        setFindFriendsResults(users)
      } finally {
        setFindFriendsLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [activeTab, findFriendsQuery])

  // Fetch friend requests (followers who we don't follow back) when Find Friends tab is active
  const refetchFriendRequests = async () => {
    if (!currentUsername) return
    setFriendRequestsLoading(true)
    try {
      const [followersRes, followingRes] = await Promise.all([
        api.getFollowers(currentUsername, undefined, 100),
        api.getFollowing(currentUsername, undefined, 100)
      ])
      const followingIds = new Set((followingRes?.users ?? []).map((u) => u.id))
      const pending = (followersRes?.users ?? []).filter((u) => !followingIds.has(u.id))
      setFriendRequests(pending)
    } finally {
      setFriendRequestsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'find-friends' && currentUsername) {
      refetchFriendRequests()
    }
  }, [activeTab, currentUsername])

  useEffect(() => {
    if (!avatarLightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAvatarLightboxOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [avatarLightboxOpen])

  useEffect(() => {
    if (editProfileOpen && profile) {
      setEditDisplayName(profile.displayName ?? '')
      setEditLocation(profile.addressText || profile.city || '')
      setEditProfileError(null)
    }
  }, [editProfileOpen, profile])

  useEffect(() => {
    if (!editProfileOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (landmarkFormOpen) closeLandmarkForm()
        else setEditProfileOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [editProfileOpen, landmarkFormOpen])

  const handleSaveProfile = async () => {
    if (!profile) return
    setEditProfileError(null)
    setEditProfileSaving(true)
    try {
      await api.updateCurrentUserProfile({
        displayName: editDisplayName.trim() || undefined,
        addressText: editLocation.trim() || undefined,
        city: editLocation.trim() || undefined
      })
      await refetch()
      setEditProfileOpen(false)
    } catch (err) {
      setEditProfileError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setEditProfileSaving(false)
    }
  }

  const openLandmarkForm = (landmark?: Landmark) => {
    if (landmark) {
      setEditingLandmarkId(landmark.id)
      setLandmarkFormName(landmark.name)
    } else {
      setEditingLandmarkId(null)
      setLandmarkFormName('')
    }
    setLandmarkFormOpen(true)
    setLandmarkError(null)
  }

  const closeLandmarkForm = () => {
    setLandmarkFormOpen(false)
    setEditingLandmarkId(null)
    setLandmarkError(null)
  }

  const handleSaveLandmark = async () => {
    const name = landmarkFormName.trim()
    if (!name) {
      setLandmarkError('Name is required')
      return
    }
    setLandmarkError(null)
    setLandmarkSaving(true)
    try {
      if (editingLandmarkId) {
        await api.updateLandmark(editingLandmarkId, { name })
      } else {
        await api.createLandmark({
          name,
          lat: 0,
          lon: 0
        })
      }
      await refetch()
      closeLandmarkForm()
    } catch (err) {
      setLandmarkError(err instanceof Error ? err.message : 'Failed to save landmark')
    } finally {
      setLandmarkSaving(false)
    }
  }

  const handleDeleteLandmark = async (landmarkId: string) => {
    if (!confirm('Remove this landmark?')) return
    try {
      await api.deleteLandmark(landmarkId)
      await refetch()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleSendFriendRequest = async (user: UserProfile) => {
    if (addingFriendId) return
    setAddingFriendId(user.id)
    try {
      await api.followUser(user.username)
      setFindFriendsResults((prev) => prev.filter((u) => u.id !== user.id))
    } catch (err) {
      console.error('Failed to send friend request:', err)
      alert(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setAddingFriendId(null)
    }
  }

  const handleAcceptFriendRequest = async (friend: Friend) => {
    if (acceptingFriendId) return
    setAcceptingFriendId(friend.id)
    try {
      await api.followUser(friend.username)
      await refetchFriends()
      await refetchFriendRequests()
      setFriendRequests((prev) => prev.filter((u) => u.id !== friend.id))
    } catch (err) {
      console.error('Failed to accept friend request:', err)
      alert(err instanceof Error ? err.message : 'Failed to accept')
    } finally {
      setAcceptingFriendId(null)
    }
  }

  const handlePostEvent = () => {
    navigate('/create-event')
  }

  const handleEditEvent = (eventId: string) => {
    navigate(`/edit-event/${eventId}`)
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      console.log('ProfileScreen: Attempting to delete event:', eventId)
      await businessEvents.deleteEvent(eventId)
      console.log('ProfileScreen: Event deleted successfully')
    } catch (error) {
      console.error('ProfileScreen: Failed to delete event:', error)
      // Show user-friendly error message
      alert(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCopyEventLink = (eventId: string) => {
    const link = `${window.location.origin}/events/${eventId}`
    navigator.clipboard.writeText(link)
    console.log('Copied link:', link)
  }

  const handleSettingsClick = async (option: string) => {
    setSettingsOpen(false)
    
    if (option === 'Log out') {
      try {
        await signOut()
        navigate('/login')
      } catch (error) {
        console.error('Error signing out:', error)
      }
    }
    // Handle other settings options here
  }

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

  // Render Business Profile Layout
  if (profile.userType === 'BUSINESS') {
    return (
      <div className="profile-screen business-profile">
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
            <h1>Business Profile</h1>
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
                        onClick={() => handleSettingsClick(option)}
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

        <div className="business-profile-body">
          <BusinessHeader
            profile={profile}
            hasActiveEvents={businessEvents.events.length > 0}
            onLogoClick={() => setAvatarLightboxOpen(true)}
          />
          {avatarLightboxOpen && (
            <div
              className="profile-avatar-lightbox-backdrop"
              onClick={() => setAvatarLightboxOpen(false)}
              role="button"
              tabIndex={0}
              aria-label="Close profile picture"
            >
              <div
                className="profile-avatar-lightbox-wrap"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <div className="profile-avatar-lightbox-content">
                  {profile.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt={`${profile.businessName || profile.displayName} logo`}
                      className="profile-avatar-lightbox-img"
                    />
                  ) : (
                    <div className="profile-avatar-lightbox-default">
                      <svg
                        viewBox="0 0 100 100"
                        fill="none"
                        stroke="#FF9B56"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="profile-avatar-lightbox-default-svg"
                      >
                        <circle cx="50" cy="40" r="22" />
                        <path d="M 15 98 Q 50 45 85 98" />
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="profile-avatar-lightbox-change-btn"
                  aria-label="Change profile picture"
                >
                  Change profile picture
                </button>
              </div>
            </div>
          )}
          <button className="post-event-btn" onClick={handlePostEvent}>
            + Post Event
          </button>

          <div className="events-section">
            <h2>Active & Upcoming Events</h2>
            <div className="events-list">
              {businessEvents.loading ? (
                <div className="empty-events">Loading events...</div>
              ) : businessEvents.events.length > 0 ? (
                businessEvents.events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() => handleEditEvent(event.id)}
                    onDelete={() => handleDeleteEvent(event.id)}
                    onCopyLink={() => handleCopyEventLink(event.id)}
                  />
                ))
              ) : (
                <div className="empty-events">No active events</div>
              )}
            </div>
          </div>

          <div className="map-preview">
            <h3>Event Locations</h3>
            <BusinessMapView 
              events={businessEvents.events}
              businessLocation={profile.lat && profile.lon ? { lat: profile.lat, lng: profile.lon } : undefined}
            />
          </div>

          <BusinessSettings 
            profile={profile}
            isOpen={businessSettingsOpen}
            onToggle={() => setBusinessSettingsOpen(!businessSettingsOpen)}
            onSaveSuccess={refetch}
          />
        </div>
      </div>
    )
  }
  
  // Render Regular Profile Layout (existing code)
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
                      onClick={() => handleSettingsClick(option)}
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
            <button
              type="button"
              className="profile-circle profile-circle-clickable"
              onClick={() => setAvatarLightboxOpen(true)}
              aria-label="Enlarge profile picture"
            >
              <ProfileImage 
                src={profile.profileImageUrl} 
                alt={`${profile.displayName} profile`}
                size="large"
              />
            </button>
            {avatarLightboxOpen && (
              <div
                className="profile-avatar-lightbox-backdrop"
                onClick={() => setAvatarLightboxOpen(false)}
                role="button"
                tabIndex={0}
                aria-label="Close profile picture"
              >
                <div
                  className="profile-avatar-lightbox-wrap"
                  onClick={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <div className="profile-avatar-lightbox-content">
                    {profile.profileImageUrl ? (
                      <img
                        src={profile.profileImageUrl}
                        alt={`${profile.displayName} profile`}
                        className="profile-avatar-lightbox-img"
                      />
                    ) : (
                      <div className="profile-avatar-lightbox-default">
                        <svg
                          viewBox="0 0 100 100"
                          fill="none"
                          stroke="#FF9B56"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="profile-avatar-lightbox-default-svg"
                        >
                          <circle cx="50" cy="40" r="22" />
                          <path d="M 15 98 Q 50 45 85 98" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="profile-avatar-lightbox-change-btn"
                    aria-label="Change profile picture"
                  >
                    Change profile picture
                  </button>
                </div>
              </div>
            )}
            <div className="profile-meta">
              <div className="profile-underline name-box">{profile.displayName}</div>
              <div className="profile-underline city-box">{profile.addressText || profile.city || 'Location not set'}</div>
              <div className="profile-underline friends-box">{friends?.users.length || 0} {friends?.users?.length === 1 ? 'Friend' : 'Friends'}</div>
            </div>
          </div>

          {currentUsername === profile.username && (
            <button
              type="button"
              className="edit-profile-btn"
              onClick={() => setEditProfileOpen(true)}
            >
              Edit Profile
            </button>
          )}

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

        {/* Right: Tabs (Flag, Friends, Likes, Find Friends) */}
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
              <button
                className={`tab-btn ${activeTab === 'find-friends' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setActiveTab('find-friends'); setPressedItem(null); }}
              >
                Find Friends
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
                          <span className="list-item-location">{flag.addressText || flag.city || 'Location not set'}</span>
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
                          navigate(`/profile-viewer/${encodeURIComponent(friend.username)}`)
                        }}
                      >
                        <ProfileAvatar profileImageUrl={friend.profileImageUrl} displayName={friend.displayName} />
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
                        <ProfileAvatar profileImageUrl={profile.profileImageUrl} displayName={profile.displayName} />
                        <div className="list-item-text list-item-text-likes">
                          <span className="list-item-name">{flagWithLikes.likeCount} likes</span>
                          <div className="list-item-details">
                            <span className="list-item-title">{flagWithLikes.flag.title}</span>
                            <span className="list-item-location">{flagWithLikes.flag.addressText || flagWithLikes.flag.city || 'Location not set'}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="empty-state">No liked flags yet</div>
                  )}
                </div>
              )}
              {activeTab === 'find-friends' && (
                <div className="find-friends-layout">
                  <div className="find-friends-main">
                <div className="tab-list">
                  <div className="find-friends-search">
                    <input
                      type="text"
                      className="find-friends-input"
                      placeholder="Search by username or name"
                      value={findFriendsQuery}
                      onChange={(e) => setFindFriendsQuery(e.target.value)}
                    />
                  </div>
                  {findFriendsLoading ? (
                    <div className="empty-state">Searching…</div>
                  ) : (
                    (() => {
                      const friendIds = new Set((friends?.users ?? []).map((f) => f.id))
                      const nonFriends = findFriendsResults.filter(
                        (u) => u.id !== profile?.id && !friendIds.has(u.id)
                      )
                      if (nonFriends.length === 0) {
                        return (
                          <div className="empty-state">
                            {findFriendsQuery.trim()
                              ? 'No users found or they’re already friends'
                              : 'Type to search for users to add'}
                          </div>
                        )
                      }
                          return nonFriends.map((user) => (
                        <div
                          key={user.id}
                          className={`list-item-btn find-friends-item ${pressedItem === user.id ? 'pressed' : ''}`}
                        >
                          <button
                            type="button"
                            className="list-item-btn-inner"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/profile-viewer/${encodeURIComponent(user.username)}`)
                            }}
                          >
                            <ProfileAvatar profileImageUrl={user.profileImageUrl} displayName={user.displayName} />
                            <span className="list-item-name">{user.displayName ?? user.username}</span>
                          </button>
                          <button
                            type="button"
                            className="add-friend-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSendFriendRequest(user)
                            }}
                            disabled={addingFriendId === user.id}
                            aria-label={`Send friend request to ${user.displayName ?? user.username}`}
                          >
                            <span className="add-friend-icon">+</span>
                          </button>
                        </div>
                      ))
                    })()
                  )}
                </div>
                  </div>
                  <div className="friend-requests-column">
                    <h3 className="friend-requests-title">Friend Requests</h3>
                    {friendRequestsLoading ? (
                      <div className="empty-state">Loading…</div>
                    ) : friendRequests.length === 0 ? (
                      <div className="empty-state">No pending requests</div>
                    ) : (
                      <div className="tab-list friend-requests-list">
                        {friendRequests.map((friend) => (
                          <div
                            key={friend.id}
                            className={`list-item-btn find-friends-item friend-request-item ${pressedItem === friend.id ? 'pressed' : ''}`}
                          >
                            <button
                              type="button"
                              className="list-item-btn-inner"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPressedItem(pressedItem === friend.id ? null : friend.id)
                              }}
                            >
                              <ProfileAvatar profileImageUrl={friend.profileImageUrl} displayName={friend.displayName} />
                              <span className="list-item-name">{friend.displayName ?? friend.username}</span>
                            </button>
                            <button
                              type="button"
                              className="accept-friend-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAcceptFriendRequest(friend)
                              }}
                              disabled={acceptingFriendId === friend.id}
                              aria-label={`Accept request from ${friend.displayName ?? friend.username}`}
                            >
                              {acceptingFriendId === friend.id ? '…' : 'Accept'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editProfileOpen && (
        <div
          className="edit-profile-backdrop"
          onClick={() => !landmarkFormOpen && setEditProfileOpen(false)}
          role="presentation"
        >
          <div
            className="edit-profile-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="edit-profile-title"
          >
            <h3 id="edit-profile-title">Edit Profile</h3>
            <div className="edit-profile-field">
              <label htmlFor="edit-display-name">Display name</label>
              <input
                id="edit-display-name"
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Display name"
              />
            </div>
            <div className="edit-profile-field">
              <label htmlFor="edit-location">Location</label>
              <input
                id="edit-location"
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="City or address"
              />
            </div>
            {editProfileError && (
              <div className="settings-save-error" role="alert">{editProfileError}</div>
            )}
            <div className="edit-profile-actions">
              <button
                type="button"
                className="save-profile-btn"
                onClick={handleSaveProfile}
                disabled={editProfileSaving}
              >
                {editProfileSaving ? 'Saving…' : 'Save profile'}
              </button>
              <button
                type="button"
                className="cancel-profile-btn"
                onClick={() => setEditProfileOpen(false)}
              >
                Cancel
              </button>
            </div>

            <div className="edit-profile-landmarks-section">
              <h4>Landmarks</h4>
              <div className="edit-profile-landmark-list">
                {profile.landmarks.map((lm) => (
                  <div key={lm.id} className="edit-profile-landmark-item">
                    <span>{lm.name}</span>
                    <div className="edit-profile-landmark-item-actions">
                      <button type="button" onClick={() => openLandmarkForm(lm)}>Edit</button>
                      <button type="button" className="delete-landmark-btn" onClick={() => handleDeleteLandmark(lm.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {profile.landmarks.length === 0 && !landmarkFormOpen && (
                  <div className="empty-state" style={{ padding: '0.5rem 0' }}>No landmarks yet</div>
                )}
              </div>
              {!landmarkFormOpen ? (
                <button type="button" className="add-landmark-btn" onClick={() => openLandmarkForm()}>
                  + Add landmark
                </button>
              ) : (
                <div className="landmark-form-in-modal">
                  <div className="edit-profile-field">
                    <label>Name of place</label>
                    <input
                      type="text"
                      value={landmarkFormName}
                      onChange={(e) => setLandmarkFormName(e.target.value)}
                      placeholder="e.g. Central Park, Joe's Coffee"
                    />
                  </div>
                  {landmarkError && (
                    <div className="settings-save-error" role="alert">{landmarkError}</div>
                  )}
                  <div className="edit-profile-actions" style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="save-profile-btn"
                      onClick={handleSaveLandmark}
                      disabled={landmarkSaving}
                    >
                      {landmarkSaving ? 'Saving…' : editingLandmarkId ? 'Update' : 'Add place'}
                    </button>
                    <button type="button" className="cancel-profile-btn" onClick={closeLandmarkForm}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orange plus FAB - bottom left (same as Main Map Screen style) */}
      <Link
        to="/make_flag"
        className="profile-fab"
        aria-label="Create"
      >
        <span className="profile-fab-icon">+</span>
      </Link>
    </div>
  )
}

export default ProfileScreen
