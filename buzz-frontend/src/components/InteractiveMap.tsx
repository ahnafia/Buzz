import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './InteractiveMap.css'

export type InteractiveMapHandle = {
  zoomIn: () => void
  zoomOut: () => void
}

const InteractiveMap = forwardRef<InteractiveMapHandle>(function InteractiveMap(_, ref) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [showCreatePopup, setShowCreatePopup] = useState(false)

  useImperativeHandle(ref, () => ({
    zoomIn() {
      map.current?.zoomIn()
    },
    zoomOut() {
      map.current?.zoomOut()
    }
  }), [])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = L.map(mapContainer.current, {
      zoomControl: false
    }).setView([40.7934, -77.8616], 13)

    // Carto Positron (light, minimal)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '© CARTO'
    }).addTo(map.current)

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  const handleCreateFlag = () => {
    setShowCreatePopup(false)
    // TODO: Implement flag creation
    console.log('Creating flag...')
  }

  const handleCreateEvent = () => {
    setShowCreatePopup(false)
    // TODO: Implement event creation
    console.log('Creating event...')
  }

  return (
    <div className="map-container">
      {/* Map - full screen */}
      <div ref={mapContainer} className="interactive-map" />

      {/* Small Buzz Logo - Top Left */}
      <div className="buzz-logo-small">
        <img src="/IMG_0203.svg" alt="" className="buzz-logo-icon-small" />
        <span className="buzz-logo-text-small">Buzz</span>
      </div>

      {/* Settings Button - Top Right */}
      <div className="settings-button-container">
        <button className="settings-btn">⚙️</button>
      </div>

      {/* Floating Top Search Bar */}
      <div className="floating-search">
        <input
          type="text"
          placeholder="Search locations..."
          className="map-search-bar"
        />
      </div>

      {/* Floating Bottom Menu Bar */}
      <div className="floating-bottom-menu">
        <button className="menu-item">
          <span className="menu-icon">🏠</span>
        </button>

        <button
          className="menu-item create-btn"
          onClick={() => setShowCreatePopup(true)}
        >
          <span className="menu-icon create-icon">+</span>
        </button>

        <Link to="/Profile" className="menu-item profile-link">
          <span className="menu-icon">👤</span>
        </Link>
      </div>

      {/* Create Popup */}
      {showCreatePopup && (
        <div className="popup-overlay" onClick={() => setShowCreatePopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h3>What would you like to create?</h3>
            <div className="popup-buttons">
              <button className="popup-btn flag-btn" onClick={handleCreateFlag}>
                <span className="popup-icon">🚩</span>
                Create Flag
              </button>
              <button className="popup-btn event-btn" onClick={handleCreateEvent}>
                <span className="popup-icon">📅</span>
                Create Event
              </button>
            </div>
            <button className="close-btn" onClick={() => setShowCreatePopup(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

export default InteractiveMap
