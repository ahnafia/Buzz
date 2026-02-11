import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './InteractiveMap.css'
import { api } from '../utils/api'
import type { Event } from '../types/api'

export type InteractiveMapHandle = {
  zoomIn: () => void
  zoomOut: () => void
  refreshEvents: () => void
  enableLocationPicker: () => void
  disableLocationPicker: () => void
  getSelectedLocation: () => { lat: number; lng: number } | null
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
  type: 'landmark' | 'event'
  category?: string
  startTime?: string
  expiresAt?: string
}



/** Convert Event to PinData */
function eventToPinData(event: Event, userLat: number, userLon: number): PinData {
  // Calculate approximate distance in feet (rough calculation)
  const latDiff = event.lat - userLat
  const lonDiff = event.lon - userLon
  const distanceKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111 // rough km conversion
  const distanceFeet = distanceKm * 3280.84 // km to feet

  const startDate = new Date(event.startTime)
  const expiresDate = new Date(event.expiresAt)
  const now = new Date()
  
  let status = 'Upcoming'
  if (now > expiresDate) status = 'Expired'
  else if (now >= startDate) status = 'Live'

  return {
    id: event.id,
    lat: event.lat,
    lng: event.lon,
    title: event.title,
    description: event.description || event.category,
    distanceFeet: Math.round(distanceFeet),
    fullDescription: event.description || `${event.category} event`,
    category: event.category,
    startTime: event.startTime,
    expiresAt: event.expiresAt,
    hours: `${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${expiresDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    tips: `Status: ${status}`,
    type: 'event'
  }
}

/** Pin icon with circular logo (white + orange first letter) at head; orange visible around it */
function pinIconForPin(pin: PinData) {
  const letter = pin.title.charAt(0).toUpperCase()
  const isEvent = pin.type === 'event'
  
  return L.divIcon({
    className: `buzz-pin-icon ${isEvent ? 'buzz-pin-icon--event' : 'buzz-pin-icon--landmark'}`,
    html: `<span class="buzz-pin-dot ${isEvent ? 'buzz-pin-dot--event' : ''}"><span class="buzz-pin-logo"><span class="buzz-pin-letter">${letter}</span></span></span>`,
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
  const [events, setEvents] = useState<Event[]>([])
  const [allPins, setAllPins] = useState<PinData[]>([])
  const [categorySearch, setCategorySearch] = useState('')
  // Only apply category filter after user commits (Enter or blur) – keeps all pins visible while typing
  const [appliedCategorySearch, setAppliedCategorySearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0)
  const [isLocationPickerMode, setIsLocationPickerMode] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Default map center (Penn State)
  const mapCenter = { lat: 40.7934, lng: -77.8616 }

  // Unique categories from all pins (used for suggestions and to validate filter)
  const allCategories = useMemo(
    () =>
      Array.from(
        new Set(
          allPins
            .map((p) => p.category)
            .filter((c): c is string => typeof c === 'string' && c.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allPins]
  )

  // Only hide pins when a known category name is entered (exact match, case-insensitive). Otherwise show all.
  const applied = appliedCategorySearch.trim().toLowerCase()
  const isKnownCategory =
    applied !== '' &&
    allCategories.some((c) => c.toLowerCase() === applied)
  const visiblePins =
    !isKnownCategory
      ? allPins
      : allPins.filter(
          (p) =>
            p.category &&
            p.category.toLowerCase() === applied
        )

  const applyCategoryFilter = () => setAppliedCategorySearch(categorySearch)

  // Suggestions that match current input (prefix or contains)
  const categorySuggestions = useMemo(() => {
    const q = categorySearch.trim().toLowerCase()
    if (q === '') return allCategories
    return allCategories.filter((c) => c.toLowerCase().includes(q))
  }, [allCategories, categorySearch])

  // Reset highlight when suggestions or query change
  useEffect(() => {
    setHighlightedSuggestionIndex(0)
  }, [categorySearch, categorySuggestions.length])

  // Clamp highlighted index to valid range
  const safeHighlightedIndex = Math.min(
    Math.max(0, highlightedSuggestionIndex),
    Math.max(0, categorySuggestions.length - 1)
  )
  const highlightedSuggestion = categorySuggestions[safeHighlightedIndex]

  // Inline completion: use the highlighted suggestion; show rest of word if it starts with typed text
  const completionSuffix = (() => {
    const q = categorySearch.trim()
    if (q === '' || !highlightedSuggestion) return ''
    if (!highlightedSuggestion.toLowerCase().startsWith(q.toLowerCase())) return ''
    return highlightedSuggestion.slice(q.length)
  })()

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedSuggestionIndex((i) =>
        Math.min(i + 1, categorySuggestions.length - 1)
      )
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedSuggestionIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key !== 'Enter') return
    if (categorySuggestions.length > 0 && highlightedSuggestion) {
      setCategorySearch(highlightedSuggestion)
      setAppliedCategorySearch(highlightedSuggestion)
      setShowSuggestions(false)
    } else {
      applyCategoryFilter()
    }
  }

  const chooseSuggestion = (category: string) => {
    setCategorySearch(category)
    setAppliedCategorySearch(category)
    setShowSuggestions(false)
  }

  const clearSearch = () => {
    setCategorySearch('')
    setAppliedCategorySearch('')
    setShowSuggestions(false)
  }

  useImperativeHandle(ref, () => ({
    zoomIn() {
      map.current?.zoomIn()
    },
    zoomOut() {
      map.current?.zoomOut()
    },
    refreshEvents() {
      fetchEvents()
    },
    enableLocationPicker() {
      setIsLocationPickerMode(true)
      setSelectedLocation(null)
    },
    disableLocationPicker() {
      setIsLocationPickerMode(false)
      setSelectedLocation(null)
    },
    getSelectedLocation() {
      return selectedLocation
    }
  }), [selectedLocation])

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      console.log('InteractiveMap: Fetching events from API...')
      const eventPins = await api.getEventPins(mapCenter.lat, mapCenter.lng, 10) // 10 mile radius
      console.log('InteractiveMap: Received event pins:', eventPins)
      
      if (eventPins) {
        // Convert EventPin objects to Event objects for state
        const events = eventPins.map(pin => ({
          id: pin.id,
          title: pin.title,
          category: pin.category,
          startTime: pin.startTime,
          expiresAt: pin.expiresAt,
          owner: pin.owner,
          lat: pin.lat,
          lon: pin.lon,
          description: pin.description
        }))
        console.log('InteractiveMap: Converted events:', events)
        setEvents(events)
        
        // Convert events to pins and set them directly
        const eventPinData = events.map(event => 
          eventToPinData(event, mapCenter.lat, mapCenter.lng)
        )
        console.log('InteractiveMap: Created pin data:', eventPinData)
        setAllPins(eventPinData)
      } else {
        console.log('InteractiveMap: No event pins received')
        setAllPins([])
      }
    } catch (error) {
      console.error('InteractiveMap: Error fetching events:', error)
      setAllPins([])
    }
  }

  // Load events on component mount
  useEffect(() => {
    fetchEvents()
  }, [])

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
    }).setView([mapCenter.lat, mapCenter.lng], 13)

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

    // Add click handler for location picking
    map.current.on('click', (e) => {
      if (isLocationPickerMode) {
        setSelectedLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Clear selected pin if it's hidden by category filter
  useEffect(() => {
    if (
      selectedPin &&
      !visiblePins.some((p) => p.id === selectedPin.id)
    ) {
      setSelectedPin(null)
    }
  }, [visiblePins, selectedPin])

  // Update markers when visible pins change (filtered by category search)
  useEffect(() => {
    if (!map.current) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // Add new markers only for visible pins
    const markers: L.Marker[] = []
    for (const pin of visiblePins) {
      const marker = L.marker([pin.lat, pin.lng], { icon: pinIconForPin(pin) })
        .bindPopup(buildPopupHtml(pin), {
          className: 'buzz-marker-popup',
          maxWidth: 320,
          minWidth: 260,
          autoPan: false
        })
        .addTo(map.current)
      marker.on('click', () => {
        setSelectedPin(pin)
        setSidebarOpen(true)
        if (map.current) {
          map.current.flyTo([pin.lat, pin.lng], 17, { duration: 1.2, easeLinearity: 0.25 })
        }
      })
      markers.push(marker)
    }
    markersRef.current = markers
  }, [visiblePins])

  // Handle location picker marker
  const locationMarkerRef = useRef<L.Marker | null>(null)
  useEffect(() => {
    if (!map.current) return

    // Remove existing location marker
    if (locationMarkerRef.current) {
      locationMarkerRef.current.remove()
      locationMarkerRef.current = null
    }

    // Add new location marker if location is selected
    if (selectedLocation && isLocationPickerMode) {
      const locationIcon = L.divIcon({
        className: 'location-picker-marker',
        html: '<div class="location-picker-dot"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })

      locationMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], { 
        icon: locationIcon 
      }).addTo(map.current)
    }
  }, [selectedLocation, isLocationPickerMode])

  const handleCreateFlag = () => {
    setShowCreatePopup(false)
    // TODO: Implement flag creation
    console.log('Creating flag...')
  }

  const handleCreateEvent = () => {
    setShowCreatePopup(false)
    // Navigate to create event screen
    window.location.href = '/create-event'
  }

  return (
    <div className="map-container">
      {/* Map - full screen */}
      <div ref={mapContainer} className="interactive-map" />

      {/* Location Picker Indicator */}
      {isLocationPickerMode && (
        <div className="location-picker-indicator">
          <div className="location-picker-message">
            📍 Tap on the map to select a location
            {selectedLocation && (
              <div className="selected-coordinates">
                Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Small Buzz Logo - Top Left */}
      <div className="buzz-logo-small">
        <img src="/IMG_0203.svg" alt="" className="buzz-logo-icon-small" />
        <span className="buzz-logo-text-small">Buzz</span>
      </div>

      {/* Floating Top Search Bar with category suggestions */}
      <div className="floating-search">
        <div className={`map-search-wrapper ${categorySearch.trim() !== '' ? 'map-search-wrapper--has-clear' : ''}`}>
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
            placeholder="Search by category..."
            className={`map-search-bar ${completionSuffix ? 'map-search-bar--has-completion' : ''}`}
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              applyCategoryFilter()
              setTimeout(() => setShowSuggestions(false), 180)
            }}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showSuggestions && categorySearch.trim() !== '' && categorySuggestions.length > 0}
          />
          {completionSuffix && (
            <div className="map-search-completion-overlay" aria-hidden="true">
              <span className="map-search-completion-typed">{categorySearch}</span>
              <span className="map-search-completion-suffix">{completionSuffix}</span>
            </div>
          )}
          {categorySearch.trim() !== '' && (
            <button
              type="button"
              className="map-search-clear-btn"
              onClick={clearSearch}
              aria-label="Clear search and show all pins"
            >
              <svg viewBox="0 0 24 24" className="map-search-clear-icon" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          )}
          {showSuggestions && categorySearch.trim() !== '' && categorySuggestions.length > 0 && (
            <ul
              className="map-search-suggestions"
              role="listbox"
              aria-label="Category suggestions"
              aria-activedescendant={categorySuggestions.length > 0 ? `suggestion-${safeHighlightedIndex}` : undefined}
            >
              {categorySuggestions.map((cat, idx) => (
                <li key={cat} role="option" id={`suggestion-${idx}`}>
                  <button
                    type="button"
                    className={`map-search-suggestion-item ${idx === safeHighlightedIndex ? 'map-search-suggestion-item--highlighted' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      chooseSuggestion(cat)
                    }}
                    onMouseEnter={() => setHighlightedSuggestionIndex(idx)}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
                  {selectedPin.type === 'event' && selectedPin.category && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">Category</span>
                      <p className="pin-detail-text">{selectedPin.category}</p>
                    </div>
                  )}
                  {selectedPin.address && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">Address</span>
                      <p className="pin-detail-text">{selectedPin.address}</p>
                    </div>
                  )}
                  {selectedPin.hours && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">{selectedPin.type === 'event' ? 'Time' : 'Hours'}</span>
                      <p className="pin-detail-text">{selectedPin.hours}</p>
                    </div>
                  )}
                  {selectedPin.tips && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">{selectedPin.type === 'event' ? 'Status' : 'Tips'}</span>
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
