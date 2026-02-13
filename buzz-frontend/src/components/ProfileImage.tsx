import { useState } from 'react'
import './ProfileImage.css'

interface ProfileImageProps {
  src?: string | null
  alt?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const ProfileImage = ({ src, alt = 'Profile', size = 'medium', className = '' }: ProfileImageProps) => {
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => {
    console.log('ProfileImage: Image failed to load:', src)
    setImageError(true)
  }

  const handleImageLoad = () => {
    console.log('ProfileImage: Image loaded successfully:', src)
  }

  // Show default avatar if no src or error loading
  const showDefaultAvatar = !src || imageError

  console.log('ProfileImage render:', { src, showDefaultAvatar, imageError })

  return (
    <div className={`profile-image ${size} ${className}`}>
      {!showDefaultAvatar && (
        <img
          src={src}
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
          className="profile-image-img"
        />
      )}
      {showDefaultAvatar && (
        <div className="profile-image-default">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            stroke="#FF9B56"
            strokeWidth="2"
            strokeLinecap="round"
            className="profile-image-svg"
          >
            <circle cx="50" cy="40" r="22" />
            <path d="M 15 98 Q 50 45 85 98" />
          </svg>
        </div>
      )}
    </div>
  )
}

export default ProfileImage