import { useRef } from 'react'
import './MainMapScreen.css'
import InteractiveMap, { type InteractiveMapHandle } from '../components/InteractiveMap.tsx'

const MainMapScreen = () => {
  const mapRef = useRef<InteractiveMapHandle>(null)

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

      {/* Map fills the rest of the screen */}
      <div className="map-container">
        <InteractiveMap ref={mapRef} />

        {/* Map Controls */}
        <div className="map-controls">
          <button type="button" className="control-btn location-btn">📍</button>
          <button type="button" className="control-btn zoom-in" onClick={() => mapRef.current?.zoomIn()}>+</button>
          <button type="button" className="control-btn zoom-out" onClick={() => mapRef.current?.zoomOut()}>-</button>
        </div>

        {/* Floating Action Button */}
        <button className="fab">
          <span className="fab-icon">+</span>
          <span className="fab-text">Post</span>
        </button>
      </div>
    </div>
  )
}

export default MainMapScreen