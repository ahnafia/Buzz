import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ProfileScreen.css'

const FLAGS_DATA = [
  { id: 'f1', title: 'Downtown Explore', location: 'Chicago, IL' },
  { id: 'f2', title: 'Leeds Gameday', location: 'Leeds, UK' },
  { id: 'f3', title: 'City Adventure', location: 'Jakarta, Indonesia' },
  { id: 'f4', title: 'Shibuya Visit', location: 'Tokyo, Japan' },
  { id: 'f5', title: 'Eiffel Tower Day', location: 'Paris, France' },
  { id: 'f6', title: 'Beach Getaway', location: 'Sydney, Australia' },
]

const FRIENDS_DATA = [
  { id: 'fr1', name: 'Alex Chen' },
  { id: 'fr2', name: 'Jordan Smith' },
  { id: 'fr3', name: 'Sam Williams' },
  { id: 'fr4', name: 'Casey Davis' },
  { id: 'fr5', name: 'Morgan Lee' },
  { id: 'fr6', name: 'Riley Johnson' },
]

const LIKES_DATA = [
  { id: 'l1', name: 'Morgan', title: 'Independence Hall Tour', location: 'Philadelphia, PA' },
  { id: 'l2', name: 'Taylor', title: 'Freedom Trail Walk', location: 'Boston, MA' },
  { id: 'l3', name: 'Riley', title: 'Pike Place Market', location: 'Seattle, WA' },
  { id: 'l4', name: 'Casey', title: 'Red Rocks Visit', location: 'Denver, CO' },
  { id: 'l5', name: 'Jordan', title: 'Barton Springs Day', location: 'Austin, TX' },
  { id: 'l6', name: 'Alex', title: 'Portland Gardens', location: 'Portland, OR' },
]

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
  const [activeTab, setActiveTab] = useState<'flag' | 'friends' | 'likes' | null>('flag')
  const [pressedItem, setPressedItem] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
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
              <div className="profile-underline name-box">Name</div>
              <div className="profile-underline city-box">City</div>
              <div className="profile-underline friends-box">Friends</div>
            </div>
          </div>

          <div className="landmarks-block">
            <div className="profile-underline landmarks-label">Landmarks</div>
            <div className="landmark-names">
              <div className="landmark-outline">Chicago</div>
              <div className="landmark-outline">Leeds</div>
              <div className="landmark-outline">Jakarta</div>
              <div className="landmark-outline">Just outside Philly</div>
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
                Flags
              </button>
              <button
                className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setActiveTab('friends'); setPressedItem(null); }}
              >
                My Friends
              </button>
              <button
                className={`tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setActiveTab('likes'); setPressedItem(null); }}
              >
                Likes
              </button>
            </div>

            <div className="tab-list-content">
              {activeTab === 'flag' && (
                <div className="tab-list">
                  {FLAGS_DATA.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`list-item-btn ${pressedItem === item.id ? 'pressed' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setPressedItem(pressedItem === item.id ? null : item.id)
                      }}
                    >
                      <span className="list-item-icon flag-icon">
                        <svg viewBox="0 0 24 24" fill="#FF9B56" width="20" height="20">
                          <path d="M5 2v20h2V2H5zm4 2h11l-4 6 4 6H9V4z" />
                        </svg>
                      </span>
                      <div className="list-item-text">
                        <span className="list-item-title">{item.title}</span>
                        <span className="list-item-location">{item.location}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {activeTab === 'friends' && (
                <div className="tab-list">
                  {FRIENDS_DATA.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`list-item-btn ${pressedItem === item.id ? 'pressed' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setPressedItem(pressedItem === item.id ? null : item.id)
                      }}
                    >
                      <ProfileAvatar />
                      <span className="list-item-name">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {activeTab === 'likes' && (
                <div className="tab-list">
                  {LIKES_DATA.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`list-item-btn ${pressedItem === item.id ? 'pressed' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setPressedItem(pressedItem === item.id ? null : item.id)
                      }}
                    >
                      <ProfileAvatar />
                      <div className="list-item-text list-item-text-likes">
                        <span className="list-item-name">{item.name}</span>
                        <div className="list-item-details">
                          <span className="list-item-title">{item.title}</span>
                          <span className="list-item-location">{item.location}</span>
                        </div>
                      </div>
                    </button>
                  ))}
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
