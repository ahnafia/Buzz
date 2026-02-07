import './MapView.css'

const MapView = () => {
  return (
    <div className="map-container">
      <div className="map-placeholder">
        <div className="map-content">
          <h2>Interactive Map</h2>
          <p>Map integration goes here</p>
          <div className="map-controls">
            <button className="map-btn">My Location</button>
            <button className="map-btn">Add Post</button>
          </div>
        </div>
      </div>
      
      <div className="floating-panels">
        <div className="post-panel">
          <h4>Recent Posts Nearby</h4>
          <div className="post-item">
            <strong>@user1</strong> checked in at Coffee Shop
          </div>
          <div className="post-item">
            <strong>@user2</strong> shared a photo at Park
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapView