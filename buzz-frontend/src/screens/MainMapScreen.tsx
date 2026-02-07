import './MainMapScreen.css'

const MainMapScreen = () => {
  return (
    <div className="main-map-screen">
      {/* Top Header */}
      <div className="map-header">
        <div className="header-left">
          <button className="menu-btn">☰</button>
          <h1 className="app-title">Buzz</h1>
        </div>
        <div className="header-center">
          <input 
            type="text" 
            placeholder="Search places..." 
            className="map-search"
          />
        </div>
        <div className="header-right">
          <button className="profile-btn">👤</button>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="map-container">
        <div className="map-placeholder">
          <div className="map-overlay">
            <h2>Interactive Map View</h2>
            <p>Map integration (Google Maps, Mapbox, etc.) goes here</p>
          </div>
        </div>

        {/* Map Controls */}
        <div className="map-controls">
          <button className="control-btn location-btn">📍</button>
          <button className="control-btn zoom-in">+</button>
          <button className="control-btn zoom-out">-</button>
        </div>

        {/* Floating Action Button */}
        <button className="fab">
          <span className="fab-icon">+</span>
          <span className="fab-text">Post</span>
        </button>

        {/* Bottom Sheet for Posts */}
        <div className="bottom-sheet">
          <div className="sheet-handle"></div>
          <div className="sheet-content">
            <h3>Nearby Posts</h3>
            <div className="post-list">
              <div className="post-preview">
                <div className="post-avatar">👤</div>
                <div className="post-content">
                  <strong>@user1</strong>
                  <p>Just checked in at the coffee shop! ☕</p>
                  <span className="post-location">📍 0.2 km away</span>
                </div>
              </div>
              <div className="post-preview">
                <div className="post-avatar">👤</div>
                <div className="post-content">
                  <strong>@user2</strong>
                  <p>Beautiful sunset at the park 🌅</p>
                  <span className="post-location">📍 0.5 km away</span>
                </div>
              </div>
              <div className="post-preview">
                <div className="post-avatar">👤</div>
                <div className="post-content">
                  <strong>@user3</strong>
                  <p>Great food at this restaurant! 🍕</p>
                  <span className="post-location">📍 1.2 km away</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MainMapScreen