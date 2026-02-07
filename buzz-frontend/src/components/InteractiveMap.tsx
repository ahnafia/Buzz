import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
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

  return <div ref={mapContainer} className="interactive-map" />
})

export default InteractiveMap
