import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LocationPickerMap from '../components/LocationPickerMap'
import '../components/LocationPickerMap.css'
import './MakeFlagScreen.css'
import { api } from '../utils/api'

const ACCEPT_MEDIA = 'image/*,video/*'

export const FLAG_COLORS = ['#64B9D3', '#FF9B56', '#F7CA1D', '#FF5B59'] as const

export type FlagLocation = { lat: number; lng: number } | null

const MakeFlagScreen = () => {
  const navigate = useNavigate()
  const [flagName, setFlagName] = useState('')
  const [location, setLocation] = useState<FlagLocation>(null)
  const [locationLabel, setLocationLabel] = useState('')
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [flagColor, setFlagColor] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updatePreview = (files: File[]) => {
    const first = files[0]
    if (!first?.type.startsWith('image/') && !first?.type.startsWith('video/')) return
    setPreviewUrl(prev => {
      URL.revokeObjectURL(prev ?? '')
      return URL.createObjectURL(first)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const next = Array.from(files)
    const combined = [...mediaFiles, ...next]
    setMediaFiles(combined)
    updatePreview(combined)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith('image/') || f.type.startsWith('video/')
    )
    if (!files.length) return
    const combined = [...mediaFiles, ...files]
    setMediaFiles(combined)
    updatePreview(combined)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  const clearMedia = () => {
    setMediaFiles([])
    setPreviewUrl(prev => { URL.revokeObjectURL(prev ?? ''); return null })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
      await api.createFlag({
        title: name,
        description: caption.trim() || null,
        lat: location.lat,
        lon: location.lng,
        city: locationLabel.trim() || null,
        addressText: locationLabel.trim() || null,
        category: tags.trim() || null,
        imageUrl: null,
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
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_MEDIA}
            multiple
            className="make-flag-file-input"
            aria-label="Upload images or videos"
            onChange={handleFileChange}
          />
          <div
            className={`make-flag-square-area ${isDragging ? 'make-flag-square-area--dragging' : ''} ${mediaFiles.length ? 'make-flag-square-area--has-files' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
            aria-label="Upload images or videos. Click or drop files here."
          >
            {previewUrl ? (
              <div className="make-flag-upload-preview">
                {mediaFiles[0]?.type.startsWith('video/') ? (
                  <video src={previewUrl} className="make-flag-upload-preview-media" muted playsInline />
                ) : (
                  <img src={previewUrl} alt="" className="make-flag-upload-preview-media" />
                )}
                <span className="make-flag-upload-count">{mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''}</span>
                <button type="button" className="make-flag-upload-clear" onClick={e => { e.stopPropagation(); clearMedia() }} aria-label="Remove uploads">✕</button>
              </div>
            ) : (
              <>
                <span className="make-flag-upload-placeholder-text">Drop images or videos here</span>
                <span className="make-flag-upload-placeholder-sub">or click to browse</span>
              </>
            )}
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
