import { useRef } from 'react'
import './MainMapScreen.css'
import InteractiveMap, { type InteractiveMapHandle } from '../components/InteractiveMap.tsx'
import UserSelector from '../components/UserSelector'

const MainMapScreen = () => {
  const mapRef = useRef<InteractiveMapHandle>(null)

  return (
    <div className="main-map-screen">
      {/* User selector in top-right corner */}
      <div className="main-map-header">
        <UserSelector />
      </div>
      
      {/* Map fills the entire screen */}
      <div className="map-container">
        <InteractiveMap ref={mapRef} />
      </div>
    </div>
  )
}

export default MainMapScreen