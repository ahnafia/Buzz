import { useRef } from 'react'
import './MainMapScreen.css'
import InteractiveMap, { type InteractiveMapHandle } from '../components/InteractiveMap.tsx'

const MainMapScreen = () => {
  const mapRef = useRef<InteractiveMapHandle>(null)

  return (
    <div className="main-map-screen">
      {/* Map fills the entire screen */}
      <div className="map-container">
        <InteractiveMap ref={mapRef} />
      </div>
    </div>
  )
}

export default MainMapScreen