import { useState } from 'react'
import './EventImage.css'

interface EventImageProps {
  src?: string | null
  alt?: string
  size?: 'pin' | 'popup' | 'small' | 'medium' | 'large'
  className?: string
}

const EventImage = ({ src, alt = 'Event', size = 'medium', className = '' }: EventImageProps) => {
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => {
    console.log('EventImage: Image failed to load:', src)
    setImageError(true)
  }

  const handleImageLoad = () => {
    console.log('EventImage: Image loaded successfully:', src)
  }

  // Show default event icon if no src or error loading
  const showDefaultIcon = !src || imageError

  console.log('EventImage render:', { src, showDefaultIcon, imageError })

  return (
    <div className={`event-image ${size} ${className}`}>
      {!showDefaultIcon && (
        <img
          src={src}
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
          className="event-image-img"
        />
      )}
      {showDefaultIcon && (
        <div className="event-image-default">
          <svg
            viewBox="0 0 24 24"
            fill="#FF9B56"
            className="event-image-svg"
          >
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
        </div>
      )}
    </div>
  )
}

export default EventImage