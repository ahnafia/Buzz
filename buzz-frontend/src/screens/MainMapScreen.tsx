import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './MainMapScreen.css'
import InteractiveMap, { type InteractiveMapHandle } from '../components/InteractiveMap.tsx'
import UserSelector from '../components/UserSelector'

type MapLocationState = {
  findFriendsUsername?: string
  focusFlag?: { id: string; lat: number; lon: number }
}

const MainMapScreen = () => {
  const mapRef = useRef<InteractiveMapHandle>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as MapLocationState | null
  const findFriendsUsername = state?.findFriendsUsername
  const focusFlag = state?.focusFlag

  const handleInitialFocusDone = () => {
    navigate('.', { replace: true, state: {} })
  }

  return (
    <div className="main-map-screen">
      {/* User selector in top-right corner */}
      <div className="main-map-header">
        <UserSelector />
      </div>
      
      {/* Map fills the entire screen */}
      <div className="map-container">
        <InteractiveMap
          ref={mapRef}
          initialFindFriendsUsername={findFriendsUsername}
          initialFocusFlag={focusFlag}
          onInitialFocusDone={handleInitialFocusDone}
        />
      </div>
    </div>
  )
}

export default MainMapScreen