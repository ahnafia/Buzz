import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './InteractiveMap.css'
import { api } from '../utils/api'
import type { Event, Flag, UserProfile } from '../types/api'
import { useUser } from '../contexts/UserContext'
import EventImage from './EventImage'

export type InteractiveMapHandle = {
  zoomIn: () => void
  zoomOut: () => void
  refreshEvents: () => void
  enableLocationPicker: () => void
  disableLocationPicker: () => void
  getSelectedLocation: () => { lat: number; lng: number } | null
}

export type InteractiveMapProps = {
  /** Open Find Friends with this user's My Map (from ProfileViewer flag click). */
  initialFindFriendsUsername?: string
  /** Flag to zoom to and select (same zoom as clicking a pin: 15). */
  initialFocusFlag?: { id: string; lat: number; lon: number }
  /** Called after initial focus is applied so parent can clear location state. */
  onInitialFocusDone?: () => void
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
  type: 'landmark' | 'event' | 'flag'
  category?: string
  startTime?: string
  expiresAt?: string
  imageUrl?: string
}

/** Convert profile Flag (has lat, lon) to PinData for map */
function flagToPinData(flag: Flag, userLat: number, userLon: number): PinData {
  const latDiff = flag.lat - userLat
  const lonDiff = flag.lon - userLon
  const distanceKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111
  const distanceFeet = distanceKm * 3280.84
  return {
    id: flag.id,
    lat: flag.lat,
    lng: flag.lon,
    title: flag.title,
    description: flag.description ?? '',
    distanceFeet: Math.round(distanceFeet),
    fullDescription: flag.description ?? flag.addressText ?? flag.city ?? flag.category ?? 'Flag',
    address: flag.addressText ?? flag.city,
    type: 'flag',
    category: flag.category,
    imageUrl: flag.imageUrl
  }
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
    type: 'event',
    imageUrl: event.imagePath
  }
}

/** Pin icon with circular logo (white + orange first letter) at head; orange visible around it */
function pinIconForPin(pin: PinData, isSelected?: boolean) {
  const letter = pin.title.charAt(0).toUpperCase()
  const isEvent = pin.type === 'event'
  const selectedClass = isSelected ? ' buzz-pin-icon--selected' : ''


  // For events with images, try to show the image, but fallback to calendar icon
  if (isEvent && pin.imageUrl) {
    return L.divIcon({
      className: `buzz-pin-icon buzz-pin-icon--event${selectedClass}`,
      html: `<span class="buzz-pin-dot buzz-pin-dot--event">
        <span class="buzz-pin-logo">
          <img src="${pin.imageUrl}" alt="${pin.title}" class="buzz-pin-image" 
               onerror="this.style.display='none'; this.parentElement.innerHTML='<svg viewBox=\\'0 0 24 24\\' fill=\\'#FF9B56\\' style=\\'width:16px;height:16px;\\'><path d=\\'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z\\'/></svg>';" />
        </span>
      </span>`,
      iconSize: [48, 48],
      iconAnchor: [24, 16]
    })
  }

  // For events without images or non-events, show letter or calendar icon
  if (isEvent) {
    return L.divIcon({
      className: `buzz-pin-icon buzz-pin-icon--event${selectedClass}`,
      html: `<span class="buzz-pin-dot buzz-pin-dot--event">
        <span class="buzz-pin-logo">
          <svg viewBox="0 0 24 24" fill="#FF9B56" style="width:16px;height:16px;">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        </span>
      </span>`,
      iconSize: [48, 48],
      iconAnchor: [24, 16]
    })
  }

  return L.divIcon({
    className: `buzz-pin-icon buzz-pin-icon--landmark${selectedClass}`,
    html: `<span class="buzz-pin-dot"><span class="buzz-pin-logo"><span class="buzz-pin-letter">${letter}</span></span></span>`,
    iconSize: [48, 48],
    iconAnchor: [24, 16]
  })
}

/** Flag icon - rectangular flag on a pole, similar size to pins */
function flagIconForFlag(flag: PinData, isSelected?: boolean) {
  const letter = flag.title.charAt(0).toUpperCase()
  const selectedClass = isSelected ? ' buzz-flag-icon--selected' : ''

  return L.divIcon({
    className: `buzz-flag-icon${selectedClass}`,
    html: `<div class="buzz-flag-container"><div class="buzz-flag-pole"></div><div class="buzz-flag-banner"><span class="buzz-flag-letter">${letter}</span></div></div>`,
    iconSize: [40, 40],
    iconAnchor: [8, 38]
  })
}

function buildPopupHtml(pin: PinData) {
  console.log('Building popup for pin:', pin.title, 'imageUrl:', pin.imageUrl, 'type:', pin.type)

  const imageHtml = pin.imageUrl && pin.type === 'event'
    ? `<div class="buzz-popup-image-container">
         <img src="${pin.imageUrl}" alt="${pin.title}" class="buzz-popup-image" 
              onerror="console.error('Popup image failed to load:', '${pin.imageUrl}'); this.style.display='none'; this.parentElement.innerHTML='<div class=\\'buzz-popup-image-fallback\\'><svg viewBox=\\'0 0 24 24\\' fill=\\'#FF9B56\\' style=\\'width:48px;height:48px;\\'><path d=\\'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z\\'/></svg></div>';" 
              onload="console.log('Popup image loaded successfully:', '${pin.imageUrl}');" />
       </div>`
    : pin.type === 'event'
      ? `<div class="buzz-popup-image-container">
         <div class="buzz-popup-image-fallback">
           <svg viewBox="0 0 24 24" fill="#FF9B56" style="width:48px;height:48px;">
             <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
           </svg>
         </div>
       </div>`
      : ''

  return `
    <div class="buzz-popup-card">
      ${imageHtml}
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

const InteractiveMap = forwardRef<InteractiveMapHandle, InteractiveMapProps>(function InteractiveMap(
  { initialFindFriendsUsername, initialFocusFlag, onInitialFocusDone },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const initialFocusDoneRef = useRef(false)
  const [showCreatePopup, setShowCreatePopup] = useState(false)
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [eventPins, setEventPins] = useState<PinData[]>([])
  const [profileFlags, setProfileFlags] = useState<PinData[]>([])
  const [friendFlags, setFriendFlags] = useState<PinData[]>([])
  const [viewedUserFlags, setViewedUserFlags] = useState<PinData[]>([])
  const [viewedUsername, setViewedUsername] = useState<string | null>(null)
  const [userSuggestions, setUserSuggestions] = useState<UserProfile[]>([])
  const [userSuggestionsLoading, setUserSuggestionsLoading] = useState(false)
  const { currentUserId, currentUsername } = useUser()
  const [mapMode, setMapMode] = useState<'Discover' | 'Find Friends' | 'My Map'>('Discover')
  const [mapModeDropdownOpen, setMapModeDropdownOpen] = useState(false)
  const mapModeDropdownRef = useRef<HTMLDivElement>(null)
  const allPins = useMemo(() => {
    if (mapMode === 'My Map') {
      const pins = [...profileFlags]
      console.log('[Map] allPins (My Map): user flags only', { mapMode, count: pins.length, pins })
      return pins
    }
    if (mapMode === 'Find Friends') {
      console.log('[Map] allPins (Find Friends): viewed user flags', { viewedUsername, count: viewedUserFlags.length })
      return [...viewedUserFlags]
    }
    const pins = [...eventPins, ...friendFlags]
    console.log('[Map] allPins', { mapMode, eventCount: eventPins.length, friendFlagCount: friendFlags.length, total: pins.length })
    return pins
  }, [eventPins, profileFlags, friendFlags, viewedUserFlags, mapMode])
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

  // Search options: "Flags" / "Events" (filter by type) plus pin categories (Discover/Find Friends only)
  const searchOptions = useMemo(
    () => ['Flags', 'Events', ...allCategories],
    [allCategories]
  )

  // Only hide pins when a known category/type is entered (exact match, case-insensitive). Otherwise show all.
  // In "My Map" mode, filter out all event pins
  const applied = appliedCategorySearch.trim().toLowerCase()
  const isFlagsFilter = applied === 'flags'
  const isEventsFilter = applied === 'events'
  const isKnownCategory =
    applied !== '' &&
    allCategories.some((c) => c.toLowerCase() === applied)

  let filteredPins = allPins
  if (mapMode === 'My Map') {
    filteredPins = allPins.filter((p) => p.type !== 'event')
    console.log('[Map] filteredPins (My Map): flags only', { count: filteredPins.length, filteredPins })
  }

  const visiblePins = (() => {
    if (!isKnownCategory) {
      console.log('[Map] visiblePins: no category filter', { count: filteredPins.length })
      return filteredPins
    }
    if (isFlagsFilter) {
      const out = filteredPins.filter((p) => p.type === 'flag')
      console.log('[Map] visiblePins: Flags filter', { count: out.length })
      return out
    }
    if (isEventsFilter) {
      const out = filteredPins.filter((p) => p.type === 'event')
      console.log('[Map] visiblePins: Events filter', { count: out.length })
      return out
    }
    const out = filteredPins.filter(
      (p) => p.category && p.category.toLowerCase() === applied
    )
    console.log('[Map] visiblePins: category filter', { applied, count: out.length })
    return out
  })()
  }

  const visiblePins =
    !isKnownCategory
      ? filteredPins
      : filteredPins.filter(
        (p) =>
          p.category &&
          p.category.toLowerCase() === applied
      )

  const applyCategoryFilter = () => setAppliedCategorySearch(categorySearch)

  // Suggestions: Discover = "Flags", "Events", categories; Find Friends = user search results
  const categorySuggestions = useMemo(() => {
    if (mapMode === 'Find Friends') return []
    const q = categorySearch.trim().toLowerCase()
    if (q === '') return searchOptions
    return searchOptions.filter((c) => c.toLowerCase().includes(q))
  }, [mapMode, searchOptions, categorySearch])

  // For Find Friends, highlight is over userSuggestions; for Discover, over categorySuggestions
  const suggestionsCount = mapMode === 'Find Friends' ? userSuggestions.length : categorySuggestions.length

  // Reset highlight when suggestions or query change
  useEffect(() => {
    setHighlightedSuggestionIndex(0)
  }, [categorySearch, suggestionsCount])

  // Clamp highlighted index to valid range
  const safeHighlightedIndex = Math.min(
    Math.max(0, highlightedSuggestionIndex),
    Math.max(0, suggestionsCount - 1)
  )
  const highlightedSuggestion = mapMode === 'Find Friends'
    ? (userSuggestions[safeHighlightedIndex]?.displayName || userSuggestions[safeHighlightedIndex]?.username || '')
    : categorySuggestions[safeHighlightedIndex]

  // Inline completion: use the highlighted suggestion (Discover only; Find Friends no completion)
  const completionSuffix = (() => {
    if (mapMode === 'Find Friends') return ''
    const q = categorySearch.trim()
    if (q === '' || !highlightedSuggestion) return ''
    if (!highlightedSuggestion.toLowerCase().startsWith(q.toLowerCase())) return ''
    return highlightedSuggestion.slice(q.length)
  })()

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedSuggestionIndex((i) => Math.min(i + 1, suggestionsCount - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedSuggestionIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key !== 'Enter') return
    if (mapMode === 'Find Friends') {
      setShowSuggestions(false)
      const user = userSuggestions[safeHighlightedIndex]
      if (user) {
        setCategorySearch(user.displayName || user.username)
        setAppliedCategorySearch('')
        fetchViewedUserFlags(user.username)
      } else if (categorySearch.trim()) {
        // Treat typed text as username and load their My Map
        fetchViewedUserFlags(categorySearch.trim())
      }
      return
    }
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

  const chooseUserSuggestion = (user: UserProfile) => {
    setCategorySearch(user.displayName || user.username)
    setAppliedCategorySearch('')
    setShowSuggestions(false)
    fetchViewedUserFlags(user.username)
  }

  const clearSearch = () => {
    setCategorySearch('')
    setAppliedCategorySearch('')
    setShowSuggestions(false)
    if (mapMode === 'Find Friends') {
      setViewedUserFlags([])
      setViewedUsername(null)
      setUserSuggestions([])
    }
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
      fetchProfileFlags()
      fetchFriendFlags()
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

  // Fetch events from API (Discover / Find Friends only; My Map does not use these)
  const fetchEvents = async () => {
    try {
      console.log('InteractiveMap: Fetching events from API...')
      const eventPins = await api.getEventPins(mapCenter.lat, mapCenter.lng, 10) // 10 mile radius
      console.log('InteractiveMap: Received event pins:', eventPins)

      if (eventPins) {
        const events = eventPins.map(pin => ({
          id: pin.id,
          title: pin.title,
          category: pin.category,
          startTime: pin.startTime,
          expiresAt: pin.expiresAt,
          owner: pin.owner,
          lat: pin.lat,
          lon: pin.lon,
          description: pin.description,
          imagePath: pin.imagePath
        }))
        console.log('[Events] Converted to events', { count: events.length, events })
        setEvents(events)

        // Convert events to pins (flags come from user profile)
        const eventPinData = events.map(event =>
          eventToPinData(event, mapCenter.lat, mapCenter.lng)
        )
        setEventPins(eventPinData)
        console.log('[Events] Set eventPins', { count: eventPinData.length, eventPinData })
      } else {
        setEventPins([])
        console.log('[Events] No event pins, set eventPins to []')
      }
    } catch (error) {
      console.error('[Events] Error fetching events:', error)
      setEventPins([])
    }
  }

  // Load friends' flags for Discover map (each friend's profile recentFlags)
  const fetchFriendFlags = async () => {
    console.log('[Discover] fetchFriendFlags called', { currentUsername })
    if (!currentUsername) {
      console.log('[Discover] No currentUsername – not loading friend flags')
      setFriendFlags([])
      return
    }
    try {
      const friendsRes = await api.getFriends(currentUsername)
      const friends = friendsRes?.users ?? []
      console.log('[Discover] getFriends result', { friendCount: friends.length, friends })
      const allFlags: PinData[] = []
      for (const friend of friends) {
        const profile = await api.getEnhancedProfile(friend.username)
        const flags = profile?.recentFlags ?? []
        console.log('[Discover] Friend', friend.username, 'flags', { count: flags.length })
        for (const flag of flags) {
          allFlags.push(flagToPinData(flag, mapCenter.lat, mapCenter.lng))
        }
      }
      setFriendFlags(allFlags)
      console.log('[Discover] Set friendFlags', { count: allFlags.length, allFlags })
    } catch (error) {
      console.error('[Discover] Error fetching friend flags:', error)
      setFriendFlags([])
    }
  }

  // Find Friends: load a user's flags (their "My Map") by username.
  // Uses the same source as the profile page: getEnhancedProfile(username).recentFlags.
  const fetchViewedUserFlags = async (username: string) => {
    const trimmed = username.trim()
    if (!trimmed) {
      setViewedUserFlags([])
      setViewedUsername(null)
      return
    }
    try {
      const profile = await api.getEnhancedProfile(trimmed)
      const flags = profile?.recentFlags ?? []
      const pinData = flags.map((flag: Flag) =>
        flagToPinData(flag, mapCenter.lat, mapCenter.lng)
      )
      setViewedUserFlags(pinData)
      setViewedUsername(trimmed)
    } catch (error) {
      console.error('InteractiveMap: Error fetching user flags for', trimmed, error)
      setViewedUserFlags([])
      setViewedUsername(null)
    }
  }

  // Load flags from the current user's profile (My Map = user's own flags only)
  const fetchProfileFlags = async () => {
    console.log('[My Map] fetchProfileFlags called', { currentUserId, currentUsername })
    if (!currentUserId) {
      console.log('[My Map] No currentUserId – not loading profile flags')
      setProfileFlags([])
      return
    }
    try {
      console.log('[My Map] Fetching flags for user:', currentUserId)
      let flags: Flag[] = []
      const directFlags = await api.getMyFlags()
      console.log('[My Map] api.getMyFlags() result', { count: directFlags?.length ?? 0, directFlags })
      if (directFlags && directFlags.length > 0) {
        flags = directFlags
        console.log('[My Map] Using', flags.length, 'flag(s) from GET /users/me/flags', flags)
      } else {
        const profile = await api.getCurrentUserProfile()
        console.log('[My Map] api.getCurrentUserProfile()', { recentFlagsCount: profile?.recentFlags?.length ?? 0, profile })
        flags = profile?.recentFlags ?? []
        if (flags.length === 0 && currentUsername) {
          console.log('[My Map] recentFlags empty, trying getEnhancedProfile:', currentUsername)
          const enhanced = await api.getEnhancedProfile(currentUsername)
          flags = enhanced?.recentFlags ?? []
          console.log('[My Map] getEnhancedProfile recentFlags', { count: flags.length, flags })
        } else {
          console.log('[My Map] Profile recentFlags', { count: flags.length, flags: flags.length > 0 ? flags : '(none)' })
        }
      }
      const pinData = flags.map((flag: Flag) =>
        flagToPinData(flag, mapCenter.lat, mapCenter.lng)
      )
      setProfileFlags(pinData)
      console.log('[My Map] Set profileFlags (user own flags)', { count: pinData.length, pinData })
    } catch (error) {
      console.error('[My Map] Error fetching profile flags:', error)
      setProfileFlags([])
    }
  }

  // Load events on component mount
  useEffect(() => {
    fetchEvents()
  }, [])

  // Load profile flags when user is logged in (and when username is available for fallback)
  useEffect(() => {
    fetchProfileFlags()
  }, [currentUserId, currentUsername])

  // Load friends' flags for Discover map when username is available
  useEffect(() => {
    fetchFriendFlags()
  }, [currentUsername])

  useEffect(() => {
    console.log('[Map] mapMode changed', { mapMode })
  }, [mapMode])

  // From ProfileViewer: open Find Friends with this user and load their My Map
  useEffect(() => {
    if (!initialFindFriendsUsername || initialFocusDoneRef.current) return
    setMapMode('Find Friends')
    setCategorySearch(initialFindFriendsUsername)
    setAppliedCategorySearch('')
    fetchViewedUserFlags(initialFindFriendsUsername)
  }, [initialFindFriendsUsername])

  // After viewed user flags load, zoom to the focused flag (same zoom as pin click: 15)
  useEffect(() => {
    if (
      initialFocusDoneRef.current ||
      !initialFocusFlag ||
      !initialFindFriendsUsername ||
      viewedUsername !== initialFindFriendsUsername ||
      viewedUserFlags.length === 0 ||
      !map.current
    ) {
      return
    }
    const pin = viewedUserFlags.find((p) => p.id === initialFocusFlag.id)
    if (!pin) return
    setSelectedPin(pin)
    setSidebarOpen(true)
    const targetZoom = 15
    map.current.flyTo([pin.lat, pin.lng], targetZoom, { duration: 1.2, easeLinearity: 0.25 })
    initialFocusDoneRef.current = true
    onInitialFocusDone?.()
  }, [viewedUserFlags, viewedUsername, initialFindFriendsUsername, initialFocusFlag, onInitialFocusDone])

  // Find Friends: debounced user search for suggestions
  useEffect(() => {
    if (mapMode !== 'Find Friends') {
      setUserSuggestions([])
      return
    }
    const q = categorySearch.trim()
    if (!q) {
      setUserSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      setUserSuggestionsLoading(true)
      try {
        const users = await api.searchUsers(q, 20)
        setUserSuggestions(users)
      } finally {
        setUserSuggestionsLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [mapMode, categorySearch])

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

    // Add click handler for location picking and for deselecting pin when clicking map
    map.current.on('click', (e) => {
      if (isLocationPickerMode) {
        setSelectedLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
      } else {
        setSelectedPin(null)
        setMapModeDropdownOpen(false)
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

  // Close map mode dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mapModeDropdownRef.current &&
        !mapModeDropdownRef.current.contains(event.target as Node)
      ) {
        setMapModeDropdownOpen(false)
      }
    }

    if (mapModeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mapModeDropdownOpen])

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

    const flagCount = visiblePins.filter((p) => p.type === 'flag').length
    const eventCount = visiblePins.filter((p) => p.type === 'event').length
    console.log('[Map] Updating markers', { total: visiblePins.length, flags: flagCount, events: eventCount, visiblePins })

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // Add new markers only for visible pins (pins or flags)
    const markers: L.Marker[] = []
    for (const pin of visiblePins) {
      const icon = pin.type === 'flag'
        ? flagIconForFlag(pin, selectedPin?.id === pin.id)
        : pinIconForPin(pin, selectedPin?.id === pin.id)
      const marker = L.marker([pin.lat, pin.lng], { icon })
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
          const currentZoom = map.current.getZoom()
          const targetZoom = Math.max(currentZoom, 15)
          map.current.flyTo([pin.lat, pin.lng], targetZoom, { duration: 1.2, easeLinearity: 0.25 })
        }
      })
      markers.push(marker)
    }
    markersRef.current = markers
  }, [visiblePins, selectedPin])

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
    window.location.href = '/make_flag'
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

      {/* Map Mode Dropdown - Below Logo */}
      <div className="map-mode-dropdown-container" ref={mapModeDropdownRef}>
        <button
          type="button"
          className="map-mode-dropdown-btn"
          onClick={() => setMapModeDropdownOpen(!mapModeDropdownOpen)}
          aria-expanded={mapModeDropdownOpen}
          aria-haspopup="true"
        >
          <span className="map-mode-dropdown-label">{mapMode}</span>
          <span className="map-mode-dropdown-arrow" aria-hidden="true">
            {mapModeDropdownOpen ? '▲' : '▼'}
          </span>
        </button>
        {mapModeDropdownOpen && (
          <ul className="map-mode-dropdown-menu" role="menu">
            {(['Discover', 'Find Friends', 'My Map'] as const).map((mode) => (
              <li key={mode} role="menuitem">
                <button
                  type="button"
                  className={`map-mode-dropdown-item ${mapMode === mode ? 'map-mode-dropdown-item--active' : ''}`}
                  onClick={() => {
                    setMapMode(mode)
                    setMapModeDropdownOpen(false)
                  }}
                >
                  {mode}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Floating Top Search Bar with category suggestions - hidden in My Map mode */}
      {mapMode !== 'My Map' && (
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
            placeholder={mapMode === 'Find Friends' ? 'Search users…' : 'Search by category...'}
            className={`map-search-bar ${completionSuffix ? 'map-search-bar--has-completion' : ''}`}
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              if (mapMode !== 'Find Friends') applyCategoryFilter()
              setTimeout(() => setShowSuggestions(false), 180)
            }}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showSuggestions && categorySearch.trim() !== '' && (categorySuggestions.length > 0 || userSuggestions.length > 0)}
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
          {showSuggestions && categorySearch.trim() !== '' && (categorySuggestions.length > 0 || userSuggestions.length > 0) && (
            <ul
              className="map-search-suggestions"
              role="listbox"
              aria-label={mapMode === 'Find Friends' ? 'User suggestions' : 'Category suggestions'}
              aria-activedescendant={suggestionsCount > 0 ? `suggestion-${safeHighlightedIndex}` : undefined}
            >
              {mapMode === 'Find Friends'
                ? userSuggestions.map((user, idx) => (
                    <li key={user.id} role="option" id={`suggestion-${idx}`}>
                      <button
                        type="button"
                        className={`map-search-suggestion-item ${idx === safeHighlightedIndex ? 'map-search-suggestion-item--highlighted' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          chooseUserSuggestion(user)
                        }}
                        onMouseEnter={() => setHighlightedSuggestionIndex(idx)}
                      >
                        {user.displayName || user.username}
                        {user.displayName && user.displayName !== user.username ? ` (@${user.username})` : ''}
                      </button>
                    </li>
                  ))
                : categorySuggestions.map((cat, idx) => (
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
          {mapMode === 'Find Friends' && categorySearch.trim() !== '' && userSuggestionsLoading && (
            <div className="map-search-suggestions-loading" aria-live="polite">Searching…</div>
          )}
        </div>
        {mapMode === 'Find Friends' && viewedUsername && (
          <p className="map-viewing-user-label" aria-live="polite">
            Viewing {viewedUsername}'s My Map
          </p>
        )}
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
      )}

      {/* Floating Bottom Menu Bar */}
      <div className="floating-bottom-menu">
        <button className="menu-item menu-item--home" type="button">
          <svg className="menu-icon menu-icon--house" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L4 10V20H9V15H15V20H20V10L12 3Z" stroke="#FF9B56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#FF9B56" />
            <rect x="9" y="15" width="6" height="5" fill="#FFFBF5" />
            <circle cx="13.5" cy="17.5" r="0.8" fill="#FF9B56" />
            <rect x="10" y="11" width="4" height="4" stroke="#FFFBF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>

        <button
          className="menu-item create-btn"
          onClick={() => setShowCreatePopup(true)}
        >
          <span className="menu-icon create-icon">+</span>
        </button>

        <Link to="/Profile" className="menu-item menu-item--profile" aria-label="Profile">
          <svg className="menu-icon menu-icon--profile" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <circle cx="12" cy="8" r="3.5" stroke="#FF9B56" strokeWidth="2" fill="none" />
            <path d="M5 20c0-3.5 3.5-6 7-6s7 2.5 7 6" stroke="#FF9B56" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </Link>
      </div>

      {/* Persistent orange button (caret) – always visible, toggles sidebar */}
      <button
        type="button"
        className={`pin-sidebar-footer-btn pin-sidebar-trigger ${sidebarOpen ? 'pin-sidebar-trigger--open' : ''
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
        className={`pin-detail-sidebar ${sidebarCollapsed ? 'pin-detail-sidebar--collapsed' : ''
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
