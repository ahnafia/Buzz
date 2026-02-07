import './ProfileScreen.css'

const ProfileScreen = () => {
  return (
    <div className="profile-screen">
      <div className="profile-header">
        <button className="back-btn">← Back</button>
        <h1>Profile</h1>
        <button className="settings-btn">⚙️</button>
      </div>

      <div className="profile-content">
        <div className="profile-info">
          <div className="avatar-section">
            <div className="avatar-placeholder">
              <span>👤</span>
            </div>
            <button className="edit-avatar-btn">Edit Photo</button>
          </div>

          <div className="user-details">
            <h2 className="username">@username</h2>
            <p className="display-name">Display Name</p>
            <p className="bio">Bio goes here - tell people about yourself!</p>
            
            <div className="stats">
              <div className="stat">
                <span className="stat-number">42</span>
                <span className="stat-label">Posts</span>
              </div>
              <div className="stat">
                <span className="stat-number">128</span>
                <span className="stat-label">Following</span>
              </div>
              <div className="stat">
                <span className="stat-number">89</span>
                <span className="stat-label">Followers</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-tabs">
          <button className="tab active">Posts</button>
          <button className="tab">Check-ins</button>
          <button className="tab">Saved</button>
        </div>

        <div className="profile-posts">
          <div className="post-grid">
            <div className="post-item">Post 1</div>
            <div className="post-item">Post 2</div>
            <div className="post-item">Post 3</div>
            <div className="post-item">Post 4</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileScreen