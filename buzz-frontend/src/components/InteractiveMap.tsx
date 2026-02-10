import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './InteractiveMap.css'

export type InteractiveMapHandle = {
  zoomIn: () => void
  zoomOut: () => void
}

type PinData = {
  id: string
  lat: number
  lng: number
  title: string
  description: string
  /** Approximate distance in feet for sidebar display */
  distanceFeet: number
  /** Extra info for the right sidebar */
  fullDescription: string
  address?: string
  hours?: string
  tips?: string
}

/** Sample pins for the map – replace with real data later */
const SAMPLE_PINS: PinData[] = [
  {
    id: 'penn-state',
    lat: 40.7934,
    lng: -77.8616,
    title: 'Penn State',
    description: 'University Park campus · Be here now.',
    distanceFeet: 350,
    fullDescription: 'The main campus of Penn State University. A hub for students and visitors with libraries, dining, and events year-round.',
    address: 'University Park, State College, PA',
    hours: 'Campus open 24/7',
    tips: 'Check the events calendar for games and performances.'
  },
  {
    id: 'coffee-shop',
    lat: 40.7952,
    lng: -77.8598,
    title: 'Coffee Shop',
    description: 'Espresso, pastries & free Wi‑Fi.',
    distanceFeet: 980,
    fullDescription: 'A cozy spot for coffee and light bites. Popular with students for studying and casual meetups.',
    address: '123 College Ave',
    hours: 'Mon–Fri 7am–8pm, Sat–Sun 8am–6pm',
    tips: 'Try the house blend and the almond croissant.'
  },
  {
    id: 'sunset-park',
    lat: 40.7901,
    lng: -77.8642,
    title: 'Sunset Park',
    description: 'Great views and picnic spots.',
    distanceFeet: 1640,
    fullDescription: 'A small park with open lawns and a clear view of the western sky. Ideal for picnics and evening walks.',
    address: 'Corner of Park St & Sunset Dr',
    hours: 'Dawn to dusk',
    tips: 'Best sunset views from the north bench.'
  }
]

/** Pin icon with circular logo (white + orange first letter) at head; orange visible around it */
function pinIconForPin(pin: PinData) {
  const letter = pin.title.charAt(0).toUpperCase()
  return L.divIcon({
    className: 'buzz-pin-icon',
    html: `<span class="buzz-pin-dot"><span class="buzz-pin-logo"><span class="buzz-pin-letter">${letter}</span></span></span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 12]
  })
}

function buildPopupHtml(pin: PinData) {
  return `
    <div class="buzz-popup-card">
      <h4 class="buzz-popup-title">${pin.title}</h4>
    </div>
  `
}

function formatDistance(feet: number): string {
  if (feet < 1000) {
    return `${Math.round(feet)} ft`
  }
  const miles = feet / 5280
  return `${miles.toFixed(1)} mi`
}

const InteractiveMap = forwardRef<InteractiveMapHandle>(function InteractiveMap(_, ref) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [showCreatePopup, setShowCreatePopup] = useState(false)
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sortedPins: PinData[] = [...SAMPLE_PINS].sort((a, b) =>
    a.title.localeCompare(b.title),
  )

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
      zoomControl: false,
      // Smooth, Snap Map–style interactions
      inertia: true,
      inertiaDeceleration: 3000,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      wheelDebounceTime: 40,
      wheelPxPerZoomLevel: 80
    }).setView([40.7934, -77.8616], 13)

    // Carto Voyager (light, colorful) base – blue water, green parks/grass
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '© CARTO'
    }).addTo(map.current)

    // Labels in a dedicated pane so we can style them (slightly lighter gray)
    map.current.createPane('labels')
    const labelsPane = map.current.getPane('labels')
    if (labelsPane) {
      labelsPane.style.zIndex = '450'
    }

    // Voyager-only labels: streets/places, still fairly minimal
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      pane: 'labels',
      subdomains: 'abcd',
      maxZoom: 19,
      minZoom: 13
    }).addTo(map.current)

    // Clickable markers with card-style popups; clicking also opens the right sidebar
    const markers: L.Marker[] = []
    for (const pin of SAMPLE_PINS) {
      const marker = L.marker([pin.lat, pin.lng], { icon: pinIconForPin(pin) })
        .bindPopup(buildPopupHtml(pin), {
          className: 'buzz-marker-popup',
          maxWidth: 320,
          minWidth: 260
        })
        .addTo(map.current)
      marker.on('click', () => {
        setSelectedPin(pin)
        setSidebarOpen(true)
      })
      markers.push(marker)
    }
    markersRef.current = markers

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
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

      {/* Floating Top Search Bar */}
      <div className="floating-search">
        <div className="map-search-wrapper">
          <span className="map-search-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              className="map-search-icon-svg"
              focusable="false"
            >
              <circle cx="11" cy="11" r="6" />
              <line x1="15" y1="15" x2="20" y2="20" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search locations..."
            className="map-search-bar"
          />
        </div>
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

      {/* Persistent orange button (caret) – always visible, toggles sidebar */}
      <button
        type="button"
        className={`pin-sidebar-footer-btn pin-sidebar-trigger ${
          sidebarOpen ? 'pin-sidebar-trigger--open' : ''
        }`}
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <span className="pin-sidebar-trigger-caret" aria-hidden>
          {sidebarOpen ? '▼' : '▲'}
        </span>
      </button>

      {/* Collapsible right sidebar – more info when a pin is selected */}
      <aside
        className={`pin-detail-sidebar ${
          sidebarCollapsed ? 'pin-detail-sidebar--collapsed' : ''
        } ${sidebarOpen ? 'pin-detail-sidebar--open' : 'pin-detail-sidebar--closed'}`}
      >
          <div className="pin-detail-sidebar-inner">
            <div className="pin-detail-header">
              <h3 className="pin-detail-title">
                {selectedPin?.title ?? ''}
              </h3>
            </div>
            {!sidebarCollapsed && selectedPin && (
              <div className="pin-detail-body">
                <div className="pin-detail-card pin-detail-card--selected">
                  <p className="pin-detail-desc">{selectedPin.fullDescription}</p>
                  <span className="pin-detail-meta">
                    {formatDistance(selectedPin.distanceFeet)}
                  </span>
                  {selectedPin.address && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">Address</span>
                      <p className="pin-detail-text">{selectedPin.address}</p>
                    </div>
                  )}
                  {selectedPin.hours && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">Hours</span>
                      <p className="pin-detail-text">{selectedPin.hours}</p>
                    </div>
                  )}
                  {selectedPin.tips && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">Tips</span>
                      <p className="pin-detail-text">{selectedPin.tips}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

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
