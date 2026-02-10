import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type LocationPickerMapHandle = {
  getSelectedLocation: () => { lat: number; lng: number } | null
}

interface LocationPickerMapProps {
  initialLocation?: { lat: number; lng: number }
  onLocationSelect?: (location: { lat: number; lng: number }) => void
}

const LocationPickerMap = forwardRef<LocationPickerMapHandle, LocationPickerMapProps>(
  ({ initialLocation, onLocationSelect }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<L.Map | null>(null)
    const marker = useRef<L.Marker | null>(null)
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)

    // Default center (Penn State area)
    const defaultCenter = initialLocation || { lat: 40.7934, lng: -77.8616 }

    useImperativeHandle(ref, () => ({
      getSelectedLocation: () => selectedLocation
    }), [selectedLocation])

    useEffect(() => {
      if (!mapContainer.current) {
        console.log('LocationPickerMap: No map container found')
        return
      }

      console.log('LocationPickerMap: Initializing map...', mapContainer.current)

      // Ensure container has dimensions
      mapContainer.current.style.width = '100%'
      mapContainer.current.style.height = '400px'

      // Initialize map
      map.current = L.map(mapContainer.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
      }).setView([defaultCenter.lat, defaultCenter.lng], 13)

      console.log('LocationPickerMap: Map created, adding tile layer...')

      // Add tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: '© CARTO'
      }).addTo(map.current)

      console.log('LocationPickerMap: Tile layer added, setting up click handler...')

      // Add click handler
      map.current.on('click', (e) => {
        console.log('LocationPickerMap: Map clicked at', e.latlng)
        const location = { lat: e.latlng.lat, lng: e.latlng.lng }
        setSelectedLocation(location)
        onLocationSelect?.(location)

        // Remove existing marker
        if (marker.current) {
          marker.current.remove()
        }

        // Add new marker
        const locationIcon = L.divIcon({
          className: 'location-picker-marker',
          html: '<div class="location-picker-dot"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })

        marker.current = L.marker([location.lat, location.lng], { 
          icon: locationIcon 
        }).addTo(map.current!)
      })

      // Force map resize multiple times to ensure proper rendering
      const resizeMap = () => {
        console.log('LocationPickerMap: Invalidating map size...')
        map.current?.invalidateSize()
      }

      setTimeout(resizeMap, 100)
      setTimeout(resizeMap, 300)
      setTimeout(resizeMap, 500)

      return () => {
        console.log('LocationPickerMap: Cleaning up...')
        if (marker.current) {
          marker.current.remove()
        }
        if (map.current) {
          map.current.remove()
          map.current = null
        }
      }
    }, [defaultCenter.lat, defaultCenter.lng, onLocationSelect])

    return (
      <div className="location-picker-map-container">
        <div ref={mapContainer} className="location-picker-leaflet-map" />
        {!map.current && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 155, 86, 0.9)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '6px',
            zIndex: 1000
          }}>
            Loading map...
          </div>
        )}
        {selectedLocation && (
          <div className="selected-location-info">
            📍 Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </div>
        )}
      </div>
    )
  }
)

LocationPickerMap.displayName = 'LocationPickerMap'

export default LocationPickerMap