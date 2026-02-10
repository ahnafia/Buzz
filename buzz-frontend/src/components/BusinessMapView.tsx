import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Event } from '../types/api'

interface BusinessMapViewProps {
  events: Event[]
  businessLocation?: { lat: number; lng: number }
  className?: string
}

const BusinessMapView = ({ events, businessLocation, className = '' }: BusinessMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  // Default center (can be overridden by businessLocation)
  const defaultCenter = businessLocation || { lat: 40.7934, lng: -77.8616 }

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Initialize map
    map.current = L.map(mapContainer.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
    }).setView([defaultCenter.lat, defaultCenter.lng], 14)

    // Add tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '© CARTO'
    }).addTo(map.current)

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [defaultCenter.lat, defaultCenter.lng])

  // Update markers when events change
  useEffect(() => {
    if (!map.current) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const markers: L.Marker[] = []

    // Add business location marker if provided
    if (businessLocation) {
      const businessIcon = L.divIcon({
        className: 'business-location-marker',
        html: '<div class="business-location-dot">🏢</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })

      const businessMarker = L.marker([businessLocation.lat, businessLocation.lng], { 
        icon: businessIcon 
      })
        .bindPopup('<div class="business-popup"><strong>Business Location</strong></div>')
        .addTo(map.current)
      
      markers.push(businessMarker)
    }

    // Add event markers
    events.forEach((event) => {
      const eventIcon = L.divIcon({
        className: 'event-location-marker',
        html: `<div class="event-location-dot">${event.title.charAt(0).toUpperCase()}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })

      const startDate = new Date(event.startTime)
      const expiresDate = new Date(event.expiresAt)
      const now = new Date()
      
      let status = 'Upcoming'
      if (now > expiresDate) status = 'Expired'
      else if (now >= startDate) status = 'Live'

      const popupContent = `
        <div class="event-popup">
          <h4>${event.title}</h4>
          <p><strong>Category:</strong> ${event.category}</p>
          <p><strong>Time:</strong> ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Status:</strong> <span class="status-${status.toLowerCase()}">${status}</span></p>
          ${event.description ? `<p>${event.description}</p>` : ''}
        </div>
      `

      const eventMarker = L.marker([event.lat, event.lon], { icon: eventIcon })
        .bindPopup(popupContent, { maxWidth: 300 })
        .addTo(map.current!)
      
      markers.push(eventMarker)
    })

    markersRef.current = markers

    // Fit map to show all markers if there are any
    if (markers.length > 0) {
      const group = new L.FeatureGroup(markers)
      map.current.fitBounds(group.getBounds().pad(0.1))
    }
  }, [events, businessLocation])

  return (
    <div className={`business-map-view ${className}`}>
      <div ref={mapContainer} className="business-map-container" />
      {events.length === 0 && (
        <div className="no-events-overlay">
          <p>No events to display on map</p>
          <small>Create events to see them here</small>
        </div>
      )}
    </div>
  )
}

export default BusinessMapView