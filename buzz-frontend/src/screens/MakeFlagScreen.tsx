import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LocationPickerMap from '../components/LocationPickerMap'
import ImageUpload from '../components/ImageUpload'
import '../components/LocationPickerMap.css'
import './MakeFlagScreen.css'
import { api } from '../utils/api'
import { uploadFlagImages } from '../utils/storage'

export const FLAG_COLORS = ['#64B9D3', '#FF9B56', '#F7CA1D', '#FF5B59'] as const

export type FlagLocation = { lat: number; lng: number } | null

const MakeFlagScreen = () => {
  const navigate = useNavigate()
  const [flagName, setFlagName] = useState('')
  const [location, setLocation] = useState<FlagLocation>(null)
  const [locationLabel, setLocationLabel] = useState('')
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [flagColor, setFlagColor] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleImagesChange = useCallback((urls: string[]) => {
    setImageUrls(urls)
  }, [])

  const handleGenerate = async () => {
    setCreateError(null)
    const name = flagName.trim()
    if (!name) {
      setCreateError('Please enter a flag name.')
      return
    }
    if (!location) {
      setCreateError('Please choose a location on the map.')
      return
    }
    
    const color = flagColor ?? FLAG_COLORS[Math.floor(Math.random() * FLAG_COLORS.length)]
    setCreating(true)
    
    try {
      // Extract files from blob URLs for upload
      const filesToUpload: File[] = []
      for (const url of imageUrls) {
        if (url.startsWith('blob:')) {
          // This is a local file that needs to be uploaded
          const response = await fetch(url)
          const blob = await response.blob()
          const file = new File([blob], `image_${Date.now()}.jpg`, { type: blob.type })
          filesToUpload.push(file)
        }
      }

      // Upload images if any
      let uploadedImageUrls: string[] = []
      if (filesToUpload.length > 0) {
        uploadedImageUrls = await uploadFlagImages(filesToUpload)
      }

      // Include already uploaded images (non-blob URLs)
      const existingUrls = imageUrls.filter(url => !url.startsWith('blob:'))
      const allImageUrls = [...existingUrls, ...uploadedImageUrls]

      await api.createFlag({
        title: name,
        description: caption.trim() || null,
        lat: location.lat,
        lon: location.lng,
        city: locationLabel.trim() || null,
        addressText: locationLabel.trim() || null,
        category: tags.trim() || null,
        imagePaths: allImageUrls.length > 0 ? allImageUrls : null,
        color,
        isPublic: true
      })
      navigate('/', { replace: true })
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create flag.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="make-flag-screen">
      <header className="make-flag-header">
        <Link to="/" className="make-flag-back">← Back</Link>
        <h1 className="make-flag-title">Create a flag</h1>
      </header>

      <div className="make-flag-body">
        <div className="make-flag-form-column">
          <div className="make-flag-image-upload-section">
            <ImageUpload
              mode="multiple"
              maxFiles={10}
              onImagesChange={handleImagesChange}
              className="make-flag-image-upload"
            />
          </div>

          <div className="make-flag-field">
            <label className="make-flag-label">Flag Name:</label>
            <input
              type="text"
              className="make-flag-input"
              value={flagName}
              onChange={(e) => setFlagName(e.target.value)}
              placeholder="Enter flag name"
            />
          </div>

          <div className="make-flag-field">
            <label className="make-flag-label">Location:</label>
            <input
              type="text"
              className="make-flag-input"
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              placeholder="e.g. Central Park, NYC"
            />
          </div>

          <div className="make-flag-field">
            <label className="make-flag-label">Caption:</label>
            <input
              type="text"
              className="make-flag-input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Enter caption"
            />
          </div>

          <div className="make-flag-field">
            <label className="make-flag-label">Tags:</label>
            <input
              type="text"
              className="make-flag-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags (e.g. food, fun)"
            />
          </div>

          <div className="make-flag-field">
            <label className="make-flag-label">Flag color:</label>
            <div className="make-flag-color-options" role="group" aria-label="Choose flag color">
              {FLAG_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`make-flag-color-swatch ${flagColor === hex ? 'make-flag-color-swatch--selected' : ''}`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setFlagColor(hex)}
                  title={hex}
                  aria-pressed={flagColor === hex}
                />
              ))}
            </div>
            <p className="make-flag-color-hint">Optional. If none chosen, a color is picked at random.</p>
          </div>

          {createError && (
            <p className="make-flag-error" role="alert">{createError}</p>
          )}
          <button
            type="button"
            className="make-flag-generate-btn"
            onClick={handleGenerate}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'Generate'}
          </button>
        </div>

        <div className="make-flag-map-column">
          <p className="make-flag-map-label">Choose location</p>
          <LocationPickerMap
            initialLocation={location ?? undefined}
            onLocationSelect={(loc) => setLocation(loc)}
          />
        </div>
      </div>
    </div>
  )
}

export default MakeFlagScreen
