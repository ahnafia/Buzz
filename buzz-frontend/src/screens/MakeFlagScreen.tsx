import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import LocationPickerMap from '../components/LocationPickerMap'
import ImageUpload from '../components/ImageUpload'
import '../components/LocationPickerMap.css'
import './MakeFlagScreen.css'
import { api } from '../utils/api'
import { uploadFlagImages } from '../utils/storage'
import { useUser } from '../contexts/UserContext'
import { useFriends } from '../hooks/useProfile'
import type { Flag, UserProfile } from '../types/api'

export const FLAG_COLORS = ['#64B9D3', '#FF9B56', '#F7CA1D', '#FF5B59'] as const

export type FlagLocation = { lat: number; lng: number } | null

type MakeFlagLocationState = { editingFlag?: Flag }

const MakeFlagScreen = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUsername } = useUser()
  const { friends } = useFriends(currentUsername || '')
  const editingFlag = (location.state as MakeFlagLocationState | null)?.editingFlag
  const friendIds = useMemo(() => new Set((friends?.users ?? []).map((f) => f.id)), [friends?.users])

  const [flagName, setFlagName] = useState('')
  const [locationCoord, setLocationCoord] = useState<FlagLocation>(null)
  const [locationLabel, setLocationLabel] = useState('')
  const [caption, setCaption] = useState('')
  const [taggedUserTags, setTaggedUserTags] = useState<string[]>([])
  const [tagInputValue, setTagInputValue] = useState('')
  const [tagError, setTagError] = useState<string | null>(null)
  const [tagChecking, setTagChecking] = useState(false)
  const [tagSuggestions, setTagSuggestions] = useState<UserProfile[]>([])
  const [tagSuggestionsLoading, setTagSuggestionsLoading] = useState(false)
  const [tagSuggestionHighlight, setTagSuggestionHighlight] = useState(-1)
  const tagFieldRef = useRef<HTMLDivElement>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [flagColor, setFlagColor] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    const q = tagInputValue.trim().replace(/^@/, '')
    if (!q) {
      setTagSuggestions([])
      setTagSuggestionHighlight(-1)
      return
    }
    const t = setTimeout(async () => {
      setTagSuggestionsLoading(true)
      try {
        const users = await api.searchUsers(q, 10)
        const taggedUsernames = new Set(
          taggedUserTags.map((tag) => (tag.startsWith('@') ? tag.slice(1) : tag).toLowerCase().trim()).filter(Boolean)
        )
        const filtered = users.filter(
          (u) => u.username && !taggedUsernames.has((u.username || '').toLowerCase())
        )
        const sorted = [...filtered].sort((a, b) => {
          const aFriend = friendIds.has(a.id)
          const bFriend = friendIds.has(b.id)
          if (aFriend && !bFriend) return -1
          if (!aFriend && bFriend) return 1
          return 0
        })
        setTagSuggestions(sorted)
        setTagSuggestionHighlight(sorted.length > 0 ? 0 : -1)
      } finally {
        setTagSuggestionsLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [tagInputValue, taggedUserTags, friendIds])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagFieldRef.current && !tagFieldRef.current.contains(e.target as Node)) {
        setTagSuggestions([])
        setTagSuggestionHighlight(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!editingFlag) return
    setFlagName(editingFlag.title)
    setLocationCoord({ lat: editingFlag.lat, lng: editingFlag.lon })
    setLocationLabel(editingFlag.addressText ?? editingFlag.city ?? '')
    setCaption(editingFlag.description ?? '')
    const cat = editingFlag.category ?? ''
    setTaggedUserTags(cat ? cat.split(/\s+/).filter(Boolean) : [])
    setImageUrls(editingFlag.imagePaths?.length ? [...editingFlag.imagePaths] : editingFlag.imageUrl ? [editingFlag.imageUrl] : [])
    setFlagColor(editingFlag.color ?? null)
  }, [editingFlag])

  const handleImagesChange = useCallback((urls: string[]) => {
    setImageUrls(urls)
  }, [])

  const isValidUserTag = (s: string) => /^@[a-zA-Z0-9_.-]+$/.test(s.trim())
  const sanitizeTagInput = useCallback((value: string) => {
    if (!value) return ''
    if (value.startsWith('@')) {
      return '@' + value.slice(1).replace(/[^a-zA-Z0-9_.-]/g, '')
    }
    return value.replace(/[^a-zA-Z0-9_.-]/g, '')
  }, [])
  const addTag = useCallback(async () => {
    const v = tagInputValue.trim()
    if (!v) return
    const normalized = v.startsWith('@') ? v : `@${v}`
    if (!isValidUserTag(normalized)) return
    const username = normalized.slice(1)
    setTagError(null)
    setTagChecking(true)
    try {
      const profile = await api.getEnhancedProfile(username)
      if (!profile) {
        setTagError('Invalid Username Entered')
        return
      }
      setTaggedUserTags((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]))
      setTagInputValue('')
    } finally {
      setTagChecking(false)
    }
  }, [tagInputValue])

  const removeTag = useCallback((tag: string) => {
    setTaggedUserTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const addTagFromUser = useCallback((user: UserProfile) => {
    const tag = `@${user.username}`
    setTaggedUserTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
    setTagInputValue('')
    setTagError(null)
    setTagSuggestions([])
    setTagSuggestionHighlight(-1)
  }, [])

  const handleGenerate = async () => {
    console.log('🚀 handleGenerate started')
    setCreateError(null)
    const name = flagName.trim()
    console.log('📝 Flag name:', name)
    
    if (!name) {
      console.error('❌ No flag name provided')
      setCreateError('Please enter a flag name.')
      return
    }
    if (!locationCoord) {
      console.error('❌ No location selected')
      setCreateError('Please choose a location on the map.')
      return
    }
    
    console.log('📍 Selected location:', locationCoord)
    console.log('🏷️ Location label:', locationLabel)
    console.log('💬 Caption:', caption)
    console.log('🏷️ Tags:', taggedUserTags)
    console.log('🖼️ Image URLs:', imageUrls)
    
    const color = flagColor ?? FLAG_COLORS[Math.floor(Math.random() * FLAG_COLORS.length)]
    console.log('🎨 Selected color:', color)
    
    setCreating(true)
    
    try {
      console.log('🔄 Processing images...')
      // Extract files from blob URLs for upload
      const filesToUpload: File[] = []
      for (const url of imageUrls) {
        if (url.startsWith('blob:')) {
          console.log('📤 Processing blob URL for upload:', url)
          // This is a local file that needs to be uploaded
          const response = await fetch(url)
          const blob = await response.blob()
          const file = new File([blob], `image_${Date.now()}.jpg`, { type: blob.type })
          filesToUpload.push(file)
          console.log('✅ Created file for upload:', { name: file.name, size: file.size, type: file.type })
        }
      }

      // Upload images if any
      let uploadedImageUrls: string[] = []
      if (filesToUpload.length > 0) {
        console.log('📤 Uploading', filesToUpload.length, 'files...')
        uploadedImageUrls = await uploadFlagImages(filesToUpload)
        console.log('✅ Images uploaded successfully:', uploadedImageUrls)
      } else {
        console.log('ℹ️ No files to upload')
      }

      // Include already uploaded images (non-blob URLs)
      const existingUrls = imageUrls.filter(url => !url.startsWith('blob:'))
      console.log('🔗 Existing URLs (non-blob):', existingUrls)
      
      const allImageUrls = [...existingUrls, ...uploadedImageUrls]
      console.log('🖼️ All image URLs combined:', allImageUrls)

      if (editingFlag) {
        const updatePayload = {
          title: name,
          description: caption.trim() || null,
          city: locationLabel.trim() || null,
          addressText: locationLabel.trim() || null,
          category: taggedUserTags.length > 0 ? taggedUserTags.join(' ') : null,
          imageUrl: allImageUrls.length > 0 ? allImageUrls[0] : null,
          color,
          isPublic: true
        }
        console.log('📋 Update flag request:', updatePayload)
        await api.updateFlag(editingFlag.id, updatePayload)
        console.log('✅ Flag updated successfully, navigating to profile')
        navigate('/profile', { replace: true })
      } else {
        const flagRequest = {
          title: name,
          description: caption.trim() || null,
          lat: locationCoord.lat,
          lon: locationCoord.lng,
          city: locationLabel.trim() || null,
          addressText: locationLabel.trim() || null,
          category: taggedUserTags.length > 0 ? taggedUserTags.join(' ') : null,
          imagePaths: allImageUrls.length > 0 ? allImageUrls : null,
          color,
          isPublic: true
        }
        console.log('📋 Final flag request object:', flagRequest)
        console.log('🚀 Calling api.createFlag...')
        await api.createFlag(flagRequest)
        console.log('✅ Flag created successfully, navigating to home')
        navigate('/', { replace: true })
      }
    } catch (e) {
      console.error('❌ Error creating flag:', e)
      console.error('❌ Error details:', {
        message: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : undefined,
        error: e
      })
      setCreateError(e instanceof Error ? e.message : 'Failed to create flag.')
    } finally {
      setCreating(false)
      console.log('🏁 handleGenerate finished')
    }
  }

  return (
    <div className="make-flag-screen">
      <header className="make-flag-header">
        <button type="button" className="make-flag-back" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="make-flag-title">{editingFlag ? 'Edit flag' : 'Create a flag'}</h1>
      </header>

      <div className="make-flag-body">
        <div className="make-flag-form-column">
          <div className="make-flag-image-upload-section">
            <ImageUpload
              mode="multiple"
              maxFiles={10}
              onImagesChange={handleImagesChange}
              initialImages={imageUrls}
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

          <div className="make-flag-field make-flag-field--tags" ref={tagFieldRef}>
            <label className="make-flag-label">Tags:</label>
            <div className="make-flag-tag-input-wrap">
              <input
                type="text"
                className="make-flag-input"
                value={tagInputValue}
                onChange={(e) => {
                  setTagInputValue(sanitizeTagInput(e.target.value))
                  setTagError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (tagSuggestions.length > 0 && tagSuggestionHighlight >= 0 && tagSuggestionHighlight < tagSuggestions.length) {
                      addTagFromUser(tagSuggestions[tagSuggestionHighlight])
                    } else {
                      addTag()
                    }
                    return
                  }
                  if (e.key === 'Escape') {
                    setTagSuggestions([])
                    setTagSuggestionHighlight(-1)
                    return
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setTagSuggestionHighlight((prev) =>
                      tagSuggestions.length === 0 ? -1 : Math.min(prev + 1, tagSuggestions.length - 1)
                    )
                    return
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setTagSuggestionHighlight((prev) => (prev <= 0 ? -1 : prev - 1))
                    return
                  }
                }}
                placeholder="Enter @username to tag"
                disabled={tagChecking}
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={tagSuggestions.length > 0}
              />
              {tagSuggestions.length > 0 || tagSuggestionsLoading ? (
                <div className="make-flag-tag-suggestions">
                  {tagSuggestionsLoading ? (
                    <div className="make-flag-tag-suggestion-item make-flag-tag-suggestion-loading">
                      Searching…
                    </div>
                  ) : (
                    tagSuggestions.map((user, i) => (
                      <button
                        key={user.id}
                        type="button"
                        className={`make-flag-tag-suggestion-item ${i === tagSuggestionHighlight ? 'make-flag-tag-suggestion-item--highlight' : ''}`}
                        onMouseEnter={() => setTagSuggestionHighlight(i)}
                        onClick={() => addTagFromUser(user)}
                      >
                        <span className="make-flag-tag-suggestion-text">
                          <span className="make-flag-tag-suggestion-name">{user.displayName || user.username}</span>
                          <span className="make-flag-tag-suggestion-username">@{user.username}</span>
                        </span>
                        {friendIds.has(user.id) && (
                          <span className="make-flag-tag-suggestion-friend-label">Friends</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            {tagError && (
              <p className="make-flag-tag-error" role="alert">{tagError}</p>
            )}
            {taggedUserTags.length > 0 && (
              <div className="make-flag-tags-list">
                {taggedUserTags.map((tag) => (
                  <span key={tag} className="make-flag-tag-chip">
                    {tag}
                    <button
                      type="button"
                      className="make-flag-tag-chip-remove"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
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
            {creating ? (editingFlag ? 'Saving…' : 'Creating…') : (editingFlag ? 'Save changes' : 'Generate')}
          </button>
        </div>

        <div className="make-flag-map-column">
          <p className="make-flag-map-label">Choose location</p>
          <LocationPickerMap
            initialLocation={locationCoord ?? undefined}
            onLocationSelect={setLocationCoord}
          />
        </div>
      </div>
    </div>
  )
}

export default MakeFlagScreen
