import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

const FLAG_COLORS = ['#64B9D3', '#FF9B56', '#F7CA1D', '#FF5B59'] as const

function defaultFlagColor(flagId: string): string {
  let n = 0
  for (let i = 0; i < flagId.length; i++) n += flagId.charCodeAt(i)
  return FLAG_COLORS[n % FLAG_COLORS.length]
}

type PinData = {
  id: string
  lat: number
  lng: number
  title: string
  description: string
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
  userId?: string // For flags, to track the owner
  ownerProfileImageUrl?: string // For flags, the owner's profile image
  /** For flags: display name of the user who created the flag */
  ownerDisplayName?: string
  /** For flags: all image URLs (comma-separated in API, parsed to array) */
  flagImageUrls?: string[]
  /** For flags: hex color for the icon. If missing, derived from id. */
  flagColor?: string
  /** Event status: Open, Expired, or Upcoming */
  status?: string
}

/** Parse flag image URLs from both legacy imageUrl and new imagePaths fields */
function parseFlagImageUrls(flag: Flag): string[] {
  // Prefer the new imagePaths array if it exists and has content
  if (flag.imagePaths && flag.imagePaths.length > 0) {
    return flag.imagePaths.filter(Boolean)
  }
  
  // Fall back to legacy imageUrl field (could be comma-separated)
  if (flag.imageUrl && flag.imageUrl.trim()) {
    return flag.imageUrl.split(',').map((s) => s.trim()).filter(Boolean)
  }
  
  return []
}

/** Convert profile Flag (has lat, lon) to PinData for map */
function flagToPinData(
  flag: Flag,
  _userLat: number,
  _userLon: number,
  ownerProfileImageUrl?: string,
  ownerDisplayName?: string
): PinData {
  const flagImageUrls = parseFlagImageUrls(flag)
  return {
    id: flag.id,
    lat: flag.lat,
    lng: flag.lon,
    title: flag.title,
    description: flag.description ?? '',
    fullDescription: flag.description ?? flag.addressText ?? flag.city ?? flag.category ?? 'Flag',
    address: flag.addressText ?? flag.city,
    type: 'flag',
    category: flag.category,
    imageUrl: flag.imageUrl,
    userId: flag.userId,
    ownerProfileImageUrl,
    ownerDisplayName,
    flagImageUrls: flagImageUrls.length > 0 ? flagImageUrls : undefined,
    flagColor: flag.color ?? defaultFlagColor(flag.id)
  }
}

/** Convert Event to PinData. Use ownerDisplayName when provided so the pin shows display name instead of owner ID. */
function eventToPinData(event: Event, _userLat: number, _userLon: number, ownerDisplayName?: string): PinData {
  // Calculate approximate distance in feet (rough calculation)
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
    fullDescription: event.description || `${event.category} event`,
    category: event.category,
    startTime: event.startTime,
    expiresAt: event.expiresAt,
    hours: `${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${expiresDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    tips: `Status: ${status}`,
    status: status,
    ownerDisplayName: ownerDisplayName ?? event.owner,
    type: 'event',
    imageUrl: event.imagePath
  }
}

/** Find the pin closest to the given map center (by squared distance in lat/lng). */
function findClosestPinToCenter(centerLat: number, centerLng: number, pins: PinData[]): PinData | null {
  if (pins.length === 0) return null
  let best = pins[0]
  let bestD2 = (pins[0].lat - centerLat) ** 2 + (pins[0].lng - centerLng) ** 2
  for (let i = 1; i < pins.length; i++) {
    const d2 = (pins[i].lat - centerLat) ** 2 + (pins[i].lng - centerLng) ** 2
    if (d2 < bestD2) {
      bestD2 = d2
      best = pins[i]
    }
  }
  return best
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

/** Flag icon - curved flag shape (IMG_0217 style) on a pole, creator's first initial, sway animation */
function flagIconForFlag(pin: PinData, isSelected?: boolean) {
  const letter = (pin.ownerDisplayName || pin.title).charAt(0).toUpperCase()
  const selectedClass = isSelected ? ' buzz-flag-icon--selected' : ''
  const color = pin.flagColor ?? FLAG_COLORS[0]

  // Traditional flag: pole + banner (one peak, one low on top/bottom), higher on pole, slightly smaller
  const escapedLetter = letter.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return L.divIcon({
    className: `buzz-flag-icon${selectedClass}`,
    html: `<div class="buzz-flag-container">
             <div class="buzz-flag-sway">
               <svg class="buzz-flag-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                 <path class="buzz-flag-pole" d="M10 6 L10 44" stroke="#000" stroke-width="2.8" stroke-linecap="round"/>
                 <path class="buzz-flag-pole" d="M10 6 L10 44" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
                 <path class="buzz-flag-base" d="M6 45 A4 1.8 0 0 1 14 45 L10 45 Z" fill="#fff" stroke="#000" stroke-width="0.8"/>
                 <path class="buzz-flag-cloth" d="M10 10 Q18 13 23 10 Q31 7 36 10 L36 24 Q31 21 23 24 Q18 27 10 24 Z" fill="${color}" stroke="${color}" stroke-width="0.5"/>
                 <text x="23" y="17" class="buzz-flag-svg-letter" fill="white" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700">${escapedLetter}</text>
               </svg>
             </div>
           </div>`,
    iconSize: [48, 48],
    iconAnchor: [10, 46]
  })
}

function buildPopupHtml(pin: PinData) {
  console.log('Building popup for pin:', pin.title, 'imageUrl:', pin.imageUrl, 'type:', pin.type, 'flagImageUrls:', pin.flagImageUrls)

  // Helper function to escape HTML to prevent XSS
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Enhanced event image handling with better fallback and error states
  const eventImageHtml = pin.type === 'event' 
    ? pin.imageUrl 
      ? `<div class="buzz-popup-image-container buzz-popup-image-container--event">
           <img src="${escapeHtml(pin.imageUrl)}" 
                alt="${escapeHtml(pin.title)} banner image" 
                class="buzz-popup-image buzz-popup-image--event" 
                onerror="console.error('Event banner image failed to load:', '${escapeHtml(pin.imageUrl)}'); this.style.display='none'; this.parentElement.classList.add('buzz-popup-image-container--error');" 
                onload="console.log('Event banner image loaded successfully:', '${escapeHtml(pin.imageUrl)}'); this.parentElement.classList.add('buzz-popup-image-container--loaded');" />
           <div class="buzz-popup-image-fallback buzz-popup-image-fallback--event">
             <svg viewBox="0 0 24 24" fill="#FF9B56" style="width:48px;height:48px;">
               <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
             </svg>
             <span class="buzz-popup-image-fallback-text">Image unavailable</span>
           </div>
         </div>`
      : '' // No image section when no banner image exists (Requirement 4.3)
    : ''

  // Flag image carousel HTML for multiple images (Requirements 2.1, 2.2, 2.3)
  const flagImageHtml = pin.type === 'flag' && pin.flagImageUrls && pin.flagImageUrls.length > 0
    ? `<div class="buzz-popup-flag-carousel" data-pin-id="${escapeHtml(pin.id)}">
         <div class="buzz-popup-flag-carousel-main">
           <div class="buzz-popup-flag-carousel-track" style="transform: translateX(0%)">
             ${pin.flagImageUrls.map((imageUrl, index) => `
               <div class="buzz-popup-flag-carousel-slide">
                 <img src="${escapeHtml(imageUrl)}" 
                      alt="Flag image ${index + 1} of ${pin.flagImageUrls!.length}" 
                      class="buzz-popup-flag-carousel-image"
                      onerror="console.error('Flag image failed to load:', '${escapeHtml(imageUrl)}'); this.style.display='none'; this.nextElementSibling.style.display='flex';" 
                      onload="this.nextElementSibling.style.display='none';" />
                 <div class="buzz-popup-flag-carousel-error" style="display: none;">
                   <div class="buzz-popup-flag-carousel-error-icon">⚠️</div>
                   <div class="buzz-popup-flag-carousel-error-text">Failed to load image</div>
                 </div>
               </div>
             `).join('')}
           </div>
           ${pin.flagImageUrls.length > 1 ? `
             <button class="buzz-popup-flag-carousel-nav buzz-popup-flag-carousel-nav--prev" 
                     onclick="window.buzzFlagCarouselPrev && window.buzzFlagCarouselPrev('${escapeHtml(pin.id)}')"
                     aria-label="Previous image">
               <span class="buzz-popup-flag-carousel-nav-icon">‹</span>
             </button>
             <button class="buzz-popup-flag-carousel-nav buzz-popup-flag-carousel-nav--next" 
                     onclick="window.buzzFlagCarouselNext && window.buzzFlagCarouselNext('${escapeHtml(pin.id)}')"
                     aria-label="Next image">
               <span class="buzz-popup-flag-carousel-nav-icon">›</span>
             </button>
             <div class="buzz-popup-flag-carousel-counter">
               <span class="buzz-popup-flag-carousel-counter-current">1</span> / ${pin.flagImageUrls.length}
             </div>
           ` : ''}
         </div>
         ${pin.flagImageUrls.length > 1 && pin.flagImageUrls.length <= 5 ? `
           <div class="buzz-popup-flag-carousel-thumbnails">
             ${pin.flagImageUrls.map((imageUrl, index) => `
               <button class="buzz-popup-flag-carousel-thumbnail ${index === 0 ? 'buzz-popup-flag-carousel-thumbnail--active' : ''}" 
                       onclick="window.buzzFlagCarouselGoTo && window.buzzFlagCarouselGoTo('${escapeHtml(pin.id)}', ${index})"
                       aria-label="Go to image ${index + 1}">
                 <img src="${escapeHtml(imageUrl)}" alt="Thumbnail ${index + 1}" class="buzz-popup-flag-carousel-thumbnail-image" />
               </button>
             `).join('')}
           </div>
         ` : pin.flagImageUrls.length > 1 ? `
           <div class="buzz-popup-flag-carousel-dots">
             ${pin.flagImageUrls.map((_, index) => `
               <button class="buzz-popup-flag-carousel-dot ${index === 0 ? 'buzz-popup-flag-carousel-dot--active' : ''}" 
                       onclick="window.buzzFlagCarouselGoTo && window.buzzFlagCarouselGoTo('${escapeHtml(pin.id)}', ${index})"
                       aria-label="Go to image ${index + 1}"></button>
             `).join('')}
           </div>
         ` : ''}
       </div>`
    : '' // No image section when no flag images exist (Requirement 2.4)

  // Enhanced popup content with better structure
  return `
    <div class="buzz-popup-card ${pin.type === 'event' ? 'buzz-popup-card--event' : pin.type === 'flag' ? 'buzz-popup-card--flag' : ''}">
      ${eventImageHtml}
      ${flagImageHtml}
      <div class="buzz-popup-content">
        <h4 class="buzz-popup-title">${escapeHtml(pin.title)}</h4>
        ${pin.description ? `<p class="buzz-popup-description">${escapeHtml(pin.description)}</p>` : ''}
        ${pin.type === 'event' ? `
          <div class="buzz-popup-event-details">
            ${pin.hours ? `<div class="buzz-popup-event-time">${escapeHtml(pin.hours)}</div>` : ''}
            ${pin.status ? `<div class="buzz-popup-event-status buzz-popup-event-status--${escapeHtml(pin.status.toLowerCase())}">${escapeHtml(pin.status)}</div>` : ''}
          </div>
          <button class="buzz-popup-details-btn" onclick="if(window.buzzNavigateToEvent) { window.buzzNavigateToEvent('${escapeHtml(pin.id)}'); }">
            View Event Details
          </button>
        ` : pin.type === 'flag' && pin.ownerDisplayName ? `
          <div class="buzz-popup-flag-details">
            <div class="buzz-popup-flag-owner">By ${escapeHtml(pin.ownerDisplayName)}</div>
            ${pin.address ? `<div class="buzz-popup-flag-location">${escapeHtml(pin.address)}</div>` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `
}



const InteractiveMap = forwardRef<InteractiveMapHandle, InteractiveMapProps>(function InteractiveMap(
  { initialFindFriendsUsername, initialFocusFlag, onInitialFocusDone },
  ref
) {
  const navigate = useNavigate()

  // Expose navigation to global scope for Leaflet popups
  useEffect(() => {
    (window as any).buzzNavigateToEvent = (id: string) => {
      navigate(`/event/${id}`)
    }

    // Flag carousel navigation functions for popup context
    const carouselStates = new Map<string, { currentIndex: number; totalImages: number }>()

    const updateCarouselDisplay = (pinId: string, newIndex: number) => {
      const carousel = document.querySelector(`[data-pin-id="${pinId}"]`)
      if (!carousel) return

      const track = carousel.querySelector('.buzz-popup-flag-carousel-track') as HTMLElement
      const counter = carousel.querySelector('.buzz-popup-flag-carousel-counter-current')
      const thumbnails = carousel.querySelectorAll('.buzz-popup-flag-carousel-thumbnail')
      const dots = carousel.querySelectorAll('.buzz-popup-flag-carousel-dot')

      if (track) {
        track.style.transform = `translateX(-${newIndex * 100}%)`
      }
      if (counter) {
        counter.textContent = (newIndex + 1).toString()
      }

      // Update thumbnail active state
      thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle('buzz-popup-flag-carousel-thumbnail--active', index === newIndex)
      })

      // Update dot active state
      dots.forEach((dot, index) => {
        dot.classList.toggle('buzz-popup-flag-carousel-dot--active', index === newIndex)
      })

      // Update carousel state
      const state = carouselStates.get(pinId)
      if (state) {
        state.currentIndex = newIndex
      }
    }

    ;(window as any).buzzFlagCarouselPrev = (pinId: string) => {
      const carousel = document.querySelector(`[data-pin-id="${pinId}"]`)
      if (!carousel) return

      let state = carouselStates.get(pinId)
      if (!state) {
        const images = carousel.querySelectorAll('.buzz-popup-flag-carousel-slide')
        state = { currentIndex: 0, totalImages: images.length }
        carouselStates.set(pinId, state)
      }

      const newIndex = state.currentIndex > 0 ? state.currentIndex - 1 : state.totalImages - 1
      updateCarouselDisplay(pinId, newIndex)
    }

    ;(window as any).buzzFlagCarouselNext = (pinId: string) => {
      const carousel = document.querySelector(`[data-pin-id="${pinId}"]`)
      if (!carousel) return

      let state = carouselStates.get(pinId)
      if (!state) {
        const images = carousel.querySelectorAll('.buzz-popup-flag-carousel-slide')
        state = { currentIndex: 0, totalImages: images.length }
        carouselStates.set(pinId, state)
      }

      const newIndex = state.currentIndex < state.totalImages - 1 ? state.currentIndex + 1 : 0
      updateCarouselDisplay(pinId, newIndex)
    }

    ;(window as any).buzzFlagCarouselGoTo = (pinId: string, index: number) => {
      const carousel = document.querySelector(`[data-pin-id="${pinId}"]`)
      if (!carousel) return

      let state = carouselStates.get(pinId)
      if (!state) {
        const images = carousel.querySelectorAll('.buzz-popup-flag-carousel-slide')
        state = { currentIndex: 0, totalImages: images.length }
        carouselStates.set(pinId, state)
      }

      if (index >= 0 && index < state.totalImages) {
        updateCarouselDisplay(pinId, index)
      }
    }

    return () => {
      // Clean up
      delete (window as any).buzzNavigateToEvent
      delete (window as any).buzzFlagCarouselPrev
      delete (window as any).buzzFlagCarouselNext
      delete (window as any).buzzFlagCarouselGoTo
    }
  }, [navigate])

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const initialFocusDoneRef = useRef(false)
  const [showCreatePopup, setShowCreatePopup] = useState(false)
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [flagCarouselIndex, setFlagCarouselIndex] = useState(0)
  const [events, setEvents] = useState<Event[]>([])
  const [eventPins, setEventPins] = useState<PinData[]>([])
  const [profileFlags, setProfileFlags] = useState<PinData[]>([])
  const [followingFlags, setFollowingFlags] = useState<PinData[]>([])
  const [myEvents, setMyEvents] = useState<PinData[]>([])
  const [viewedUserFlags, setViewedUserFlags] = useState<PinData[]>([])
  const [viewedUsername, setViewedUsername] = useState<string | null>(null)
  const [userSuggestions, setUserSuggestions] = useState<UserProfile[]>([])
  const [userSuggestionsLoading, setUserSuggestionsLoading] = useState(false)
  const { currentUserId, currentUsername, backendUser } = useUser()
  const [mapMode, setMapMode] = useState<'Discover' | 'Find Friends' | 'My Map'>('Discover')
  const [mapModeDropdownOpen, setMapModeDropdownOpen] = useState(false)
  const mapModeDropdownRef = useRef<HTMLDivElement>(null)
  const allPins = useMemo(() => {
    if (mapMode === 'My Map') {
      const pins = [...profileFlags, ...myEvents]
      console.log('[Map] allPins (My Map): user flags & events', { mapMode, count: pins.length, pins })
      return pins
    }
    if (mapMode === 'Find Friends') {
      console.log('[Map] allPins (Find Friends): viewed user flags', { viewedUsername, count: viewedUserFlags.length })
      return [...viewedUserFlags]
    }
    // Discover: Events (Global) + Following Flags + My Flags + My Events
    const pins = [...eventPins, ...followingFlags, ...profileFlags, ...myEvents]
    console.log('[Map] allPins', { mapMode, eventCount: eventPins.length, followingFlagCount: followingFlags.length, myFlagCount: profileFlags.length, myEventCount: myEvents.length, total: pins.length })
    return pins
  }, [eventPins, profileFlags, followingFlags, myEvents, viewedUserFlags, mapMode])
  const [categorySearch, setCategorySearch] = useState('')
  // Only apply category filter after user commits (Enter or blur) – keeps all pins visible while typing
  const [appliedCategorySearch, setAppliedCategorySearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0)

  const [isLocationPickerMode, setIsLocationPickerMode] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Track liked pins (session-only)
  const [likedPinIds, setLikedPinIds] = useState<Set<string>>(new Set())
  // Track saved pins (session-only)
  const [savedPinIds, setSavedPinIds] = useState<Set<string>>(new Set())

  const toggleLike = (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation()
    setLikedPinIds(prev => {
      const next = new Set(prev)
      if (next.has(pinId)) {
        next.delete(pinId)
      } else {
        next.add(pinId)
      }
      return next
    })
  }

  const toggleSave = (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation()
    setSavedPinIds(prev => {
      const next = new Set(prev)
      if (next.has(pinId)) {
        next.delete(pinId)
      } else {
        next.add(pinId)
      }
      return next
    })
  }

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
  // In My Map, we want to show everything in allPins (which is now flags + events), so we don't filter out events anymore.
  if (mapMode === 'My Map') {
    console.log('[Map] filteredPins (My Map): showing all my content', { count: filteredPins.length, filteredPins })
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

  const visiblePinsSorted = useMemo(
    () => [...visiblePins].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    [visiblePins]
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
      fetchMyEvents()
      fetchFollowingFlags()
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
      // Use a very large radius to get "all events that exist" (approx 10,000 miles covers most inhabited land)
      const eventPins = await api.getEventPins(mapCenter.lat, mapCenter.lng, 10000)
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

        // Resolve owner IDs to display names (business name for businesses, else display name)
        const ownerIds = [...new Set(events.map(e => e.owner).filter(Boolean))]
        const ownerDisplayNames = new Map<string, string>()
        await Promise.all(
          ownerIds.map(async (id) => {
            const user = await api.getUserById(id)
            const name = user?.businessName ?? user?.displayName ?? user?.username
            if (name) ownerDisplayNames.set(id, name)
          })
        )

        // Convert events to pins (flags come from user profile)
        const eventPinData = events.map(event =>
          eventToPinData(event, mapCenter.lat, mapCenter.lng, ownerDisplayNames.get(event.owner))
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

  // Load followed users' flags for Discover map
  const fetchFollowingFlags = async () => {
    console.log('[Discover] fetchFollowingFlags called', { currentUsername })
    if (!currentUsername) {
      console.log('[Discover] No currentUsername – not loading following flags')
      setFollowingFlags([])
      return
    }
    try {
      // Get users updates from "following" list
      const followingRes = await api.getFollowing(currentUsername)
      const following = followingRes?.users ?? []
      console.log('[Discover] getFollowing result', { count: following.length, following })

      const allFlags: PinData[] = []
      // For each followed user, get their profile/flags
      // Note: This could be optimized on backend to "get flags from following"
      for (const user of following) {
        // We need enhanced profile to get recentFlags
        const profile = await api.getEnhancedProfile(user.username)
        const flags = profile?.recentFlags ?? []
        // console.log('[Discover] Followed', user.username, 'flags', { count: flags.length })
        for (const flag of flags) {
          allFlags.push(
            flagToPinData(
              flag,
              mapCenter.lat,
              mapCenter.lng,
              profile?.profileImageUrl,
              profile?.displayName ?? user.displayName ?? user.username
            )
          )
        }
      }
      setFollowingFlags(allFlags)
      console.log('[Discover] Set followingFlags', { count: allFlags.length })
    } catch (error) {
      console.error('[Discover] Error fetching following flags:', error)
      setFollowingFlags([])
    }
  }

  // Load current user's events for Discover & My Map
  const fetchMyEvents = async () => {
    console.log('[My Map] fetchMyEvents called', { currentUserId })
    if (!currentUserId) {
      setMyEvents([])
      return
    }
    try {
      const myEventsRes = await api.getMyEvents()
      const events = myEventsRes?.events ?? []
      console.log('[My Map] myEvents result', { count: events.length })

      const myDisplayName = backendUser?.businessName ?? backendUser?.displayName ?? backendUser?.username
      const pinData = events.map(event =>
        eventToPinData(event, mapCenter.lat, mapCenter.lng, myDisplayName)
      )
      setMyEvents(pinData)
    } catch (error) {
      console.error('[My Map] Error fetching my events:', error)
      setMyEvents([])
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
        flagToPinData(
          flag,
          mapCenter.lat,
          mapCenter.lng,
          profile?.profileImageUrl,
          profile?.displayName ?? trimmed
        )
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
      let userProfile: UserProfile | null = null

      const directFlags = await api.getMyFlags()
      console.log('[My Map] api.getMyFlags() result', { count: directFlags?.length ?? 0, directFlags })
      if (directFlags && directFlags.length > 0) {
        flags = directFlags
        console.log('[My Map] Using', flags.length, 'flag(s) from GET /users/me/flags', flags)
        // Get current user profile for profile image
        userProfile = await api.getCurrentUserProfile()
      } else {
        userProfile = await api.getCurrentUserProfile()
        console.log('[My Map] api.getCurrentUserProfile()', { recentFlagsCount: userProfile?.recentFlags?.length ?? 0, userProfile })
        flags = userProfile?.recentFlags ?? []
        if (flags.length === 0 && currentUsername) {
          console.log('[My Map] recentFlags empty, trying getEnhancedProfile:', currentUsername)
          const enhanced = await api.getEnhancedProfile(currentUsername)
          flags = enhanced?.recentFlags ?? []
          userProfile = enhanced
          console.log('[My Map] getEnhancedProfile recentFlags', { count: flags.length, flags })
        } else {
          console.log('[My Map] Profile recentFlags', { count: flags.length, flags: flags.length > 0 ? flags : '(none)' })
        }
      }
      const pinData = flags.map((flag: Flag) =>
        flagToPinData(
          flag,
          mapCenter.lat,
          mapCenter.lng,
          userProfile?.profileImageUrl,
          userProfile?.displayName ?? currentUsername ?? undefined
        )
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
    fetchMyEvents()
  }, [currentUserId, currentUsername])

  // Load following flags for Discover map when username is available
  useEffect(() => {
    fetchFollowingFlags()
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

    // Add click handler for location picking and for deselecting pin when clicking map (retract sidebar when flag is clicked off)
    map.current.on('click', (e) => {
      if (isLocationPickerMode) {
        setSelectedLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
      } else {
        setSelectedPin(null)
        setSidebarOpen(false)
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

  // Clear selected pin if it's hidden by category filter; retract sidebar when selection is cleared
  useEffect(() => {
    if (
      selectedPin &&
      !visiblePins.some((p) => p.id === selectedPin.id)
    ) {
      setSelectedPin(null)
      setSidebarOpen(false)
    }
  }, [visiblePins, selectedPin])

  // Reset flag image carousel when switching to a different pin
  useEffect(() => {
    setFlagCarouselIndex(0)
  }, [selectedPin?.id])

  // Reverse geocoding for events (missing address)
  useEffect(() => {
    if (selectedPin && selectedPin.type === 'event' && !selectedPin.address) {
      const fetchAddress = async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${selectedPin.lat}&lon=${selectedPin.lng}`)
          const data = await res.json()
          if (data.display_name) {
            const addr = data.address ? `${data.address.road || ''} ${data.address.house_number || ''}, ${data.address.city || data.address.town || ''}` : data.display_name;
            // Remove leading/trailing commas/spaces if some fields are missing
            const cleanAddr = addr.replace(/^[\s,]+|[\s,]+$/g, '').replace(/, ,/g, ',');

            setSelectedPin(prev => {
              if (prev && prev.id === selectedPin.id) {
                return { ...prev, address: cleanAddr || data.display_name }
              }
              return prev
            })
          }
        } catch (e) {
          console.error("Failed to reverse geocode", e)
        }
      }
      // Small timeout to avoid spamming if user clicks around fast
      const t = setTimeout(fetchAddress, 500)
      return () => clearTimeout(t)
    }
  }, [selectedPin?.id])

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

  const goToNextAlphabetical = () => {
    if (!selectedPin || visiblePinsSorted.length === 0) return
    const idx = visiblePinsSorted.findIndex((p) => p.id === selectedPin.id)
    const nextIdx = idx < 0 ? 0 : (idx + 1) % visiblePinsSorted.length
    const next = visiblePinsSorted[nextIdx]
    setSelectedPin(next)
    if (map.current) {
      const currentZoom = map.current.getZoom()
      const targetZoom = Math.max(currentZoom, 15)
      map.current.flyTo([next.lat, next.lng], targetZoom, { duration: 0.6, easeLinearity: 0.25 })
    }
  }

  const goToPrevAlphabetical = () => {
    if (!selectedPin || visiblePinsSorted.length === 0) return
    const idx = visiblePinsSorted.findIndex((p) => p.id === selectedPin.id)
    const len = visiblePinsSorted.length
    const prevIdx = idx <= 0 ? len - 1 : (idx - 1 + len) % len
    const prev = visiblePinsSorted[prevIdx]
    setSelectedPin(prev)
    if (map.current) {
      const currentZoom = map.current.getZoom()
      const targetZoom = Math.max(currentZoom, 15)
      map.current.flyTo([prev.lat, prev.lng], targetZoom, { duration: 0.6, easeLinearity: 0.25 })
    }
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
        onClick={() => {
          if (sidebarOpen) {
            setSidebarOpen(false)
          } else {
            if (!selectedPin && visiblePins.length > 0 && map.current) {
              const center = map.current.getCenter()
              const closest = findClosestPinToCenter(center.lat, center.lng, visiblePins)
              if (closest) setSelectedPin(closest)
            }
            setSidebarOpen(true)
          }
        }}
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
            {/* Header Action Buttons: Like & Save (Top Right) */}
            <div className="pin-detail-header-actions">
              <button
                className={`pin-action-btn pin-action-btn--header ${selectedPin && likedPinIds.has(selectedPin.id) ? 'pin-action-btn--liked' : ''}`}
                aria-label="Like"
                onClick={(e) => selectedPin && toggleLike(e, selectedPin.id)}
              >
                <svg viewBox="0 0 24 24" fill={selectedPin && likedPinIds.has(selectedPin.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
              <button
                className={`pin-action-btn pin-action-btn--header ${selectedPin && savedPinIds.has(selectedPin.id) ? 'pin-action-btn--saved' : ''}`}
                aria-label="Save"
                onClick={(e) => selectedPin && toggleSave(e, selectedPin.id)}
              >
                <svg viewBox="0 0 24 24" fill={selectedPin && savedPinIds.has(selectedPin.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>
          </div>
          {!sidebarCollapsed && selectedPin && (
            <div className="pin-detail-body">
              {selectedPin.type === 'flag' ? (
                <div className="pin-detail-flag-content">
                  <div className="pin-detail-flag-image-wrap">
                    {selectedPin.flagImageUrls && selectedPin.flagImageUrls.length > 0 ? (
                      <>
                        <div className="pin-detail-flag-image-container">
                          <img
                            src={selectedPin.flagImageUrls[flagCarouselIndex]}
                            alt=""
                            className="pin-detail-flag-image"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </div>
                        {selectedPin.flagImageUrls.length > 1 && (
                          <div className="pin-detail-flag-carousel-nav">
                            <button
                              type="button"
                              className="pin-detail-flag-carousel-btn"
                              onClick={() =>
                                setFlagCarouselIndex((i) =>
                                  i <= 0 ? selectedPin.flagImageUrls!.length - 1 : i - 1
                                )
                              }
                              aria-label="Previous image"
                            >
                              &lt;
                            </button>
                            <span className="pin-detail-flag-carousel-dots">
                              {selectedPin.flagImageUrls.map((_, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`pin-detail-flag-carousel-dot ${idx === flagCarouselIndex ? 'pin-detail-flag-carousel-dot--active' : ''}`}
                                  onClick={() => setFlagCarouselIndex(idx)}
                                  aria-label={`Image ${idx + 1}`}
                                />
                              ))}
                            </span>
                            <button
                              type="button"
                              className="pin-detail-flag-carousel-btn"
                              onClick={() =>
                                setFlagCarouselIndex((i) =>
                                  i >= selectedPin.flagImageUrls!.length - 1 ? 0 : i + 1
                                )
                              }
                              aria-label="Next image"
                            >
                              &gt;
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="pin-detail-flag-image-placeholder">
                        <svg viewBox="0 0 24 24" fill="#FF9B56" aria-hidden>
                          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                        </svg>
                        <span>No image</span>
                      </div>
                    )}
                  </div>
                  {(selectedPin.ownerDisplayName || selectedPin.address || selectedPin.fullDescription) && (
                    <p className="pin-detail-flag-owner-line">
                      {selectedPin.ownerDisplayName && (
                        <span className="pin-detail-flag-owner">{selectedPin.ownerDisplayName}</span>
                      )}
                      {selectedPin.ownerDisplayName && (selectedPin.address || selectedPin.fullDescription) && (
                        <span className="pin-detail-flag-owner-location-sep"> · </span>
                      )}
                      {(selectedPin.address || selectedPin.fullDescription) && (
                        <span className="pin-detail-flag-location">
                          {selectedPin.address ?? selectedPin.fullDescription}
                        </span>
                      )}
                    </p>
                  )}
                  {selectedPin.description && (
                    <p className="pin-detail-flag-caption">{selectedPin.description}</p>
                  )}
                  {selectedPin.category && (
                    <div className="pin-detail-flag-tags">
                      <span className="pin-detail-flag-tag">{selectedPin.category}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pin-detail-card pin-detail-card--selected">
                  {selectedPin.ownerDisplayName && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">Hosted by</span>
                      <p className="pin-detail-text">{selectedPin.ownerDisplayName}</p>
                    </div>
                  )}

                  {selectedPin.description && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">Description</span>
                      <p className="pin-detail-text">{selectedPin.description}</p>
                    </div>
                  )}

                  {selectedPin.startTime && selectedPin.expiresAt && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">Time</span>
                      <p className="pin-detail-text">
                        Start: {new Date(selectedPin.startTime).toLocaleDateString()} at {new Date(selectedPin.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <br />
                        End: {new Date(selectedPin.expiresAt).toLocaleDateString()} at {new Date(selectedPin.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}

                  {selectedPin.address && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">Address</span>
                      <p className="pin-detail-text">{selectedPin.address}</p>
                    </div>
                  )}

                  {selectedPin.status && (
                    <div className="pin-detail-block">
                      <span className="pin-detail-label">Status</span>
                      <p className="pin-detail-text">{selectedPin.status}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}



          <div className="pin-detail-footer">
            <button
              type="button"
              className="pin-detail-prev-btn"
              onClick={goToPrevAlphabetical}
              aria-label="Previous pin alphabetically"
              disabled={!selectedPin || visiblePinsSorted.length === 0}
            >
              &lt;
            </button>
            <button
              type="button"
              className="pin-detail-next-btn"
              onClick={goToNextAlphabetical}
              aria-label="Next pin alphabetically"
              disabled={!selectedPin || visiblePinsSorted.length === 0}
            >
              &gt;
            </button>
          </div>
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
