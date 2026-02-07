import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ProfileScreen.css'

const ProfileScreen = () => {
  const [activeTab, setActiveTab] = useState<'flag' | 'friends' | 'likes' | null>(null)
  return (
    <div className="profile-screen">
      <div className="profile-header">
        <Link to="/" className="back-btn">← Back</Link>
        <div className="profile-title-row">
          <button
            type="button"
            className="profile-icon-btn"
            aria-label="Profile icon"
          >
            <img src="/IMG_0203.svg" alt="" className="profile-header-icon" />
          </button>
          <h1>Profile</h1>
        </div>
        <button className="settings-btn">⚙️</button>
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
                onClick={() => setActiveTab('flag')}
              >
                Flags
              </button>
              <button
                className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={() => setActiveTab('friends')}
              >
                My Friends
              </button>
              <button
                className={`tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
                onClick={() => setActiveTab('likes')}
              >
                Likes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileScreen
