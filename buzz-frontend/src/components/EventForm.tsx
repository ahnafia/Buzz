import { useState, useEffect, useRef, useCallback } from 'react'
import LocationPickerMap, { type LocationPickerMapHandle } from './LocationPickerMap'
import ImageUpload from './ImageUpload'
import type { Event, CreateEventRequest, UpdateEventRequest } from '../types/api'
import { uploadEventImage } from '../utils/storage'
import './EventForm.css'
import './LocationPickerMap.css'

interface EventFormProps {
  event?: Event
  onSubmit: (eventData: CreateEventRequest | UpdateEventRequest) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  /** Initial map location (may come from business or geolocation) */
  location?: { lat: number; lon: number }
  /** Primary business location, used by the "Use Primary Business Location" button */
  primaryBusinessLocation?: { lat: number; lon: number }
}

const EventForm = ({
  event,
  onSubmit,
  onCancel,
  isLoading = false,
  location,
  primaryBusinessLocation
}: EventFormProps) => {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    category: event?.category || '',
    description: event?.description || '',
    startTime: event?.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : '',
    endTime: event?.expiresAt ? new Date(event.expiresAt).toISOString().slice(0, 16) : '',
    lat: event?.lat || location?.lat || 0,
    lon: event?.lon || location?.lon || 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [bannerImage, setBannerImage] = useState<string[]>(event?.imagePath ? [event.imagePath] : [])
  const [imageUploading, setImageUploading] = useState(false)
  const mapRef = useRef<LocationPickerMapHandle>(null)

  // Update formData when location prop changes (initial load or profile fetch)
  useEffect(() => {
    if (location && !event && formData.lat === 0 && formData.lon === 0) {
      setFormData(prev => ({
        ...prev,
        lat: location.lat,
        lon: location.lon
      }))
    }
  }, [location, event])

  // Auto-set end time when start time changes (24 hours later)
  useEffect(() => {
    if (formData.startTime && !event) {
      const startDate = new Date(formData.startTime)
      const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
      setFormData(prev => ({
        ...prev,
        endTime: endDate.toISOString().slice(0, 16)
      }))
    }
  }, [formData.startTime, event])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required'
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required'
    }

    if (formData.startTime && formData.endTime) {
      const startDate = new Date(formData.startTime)
      const endDate = new Date(formData.endTime)

      if (endDate <= startDate) {
        newErrors.endTime = 'End time must be after start time'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setImageUploading(true)
      
      // Handle image upload if there's a new image
      let imagePath: string | undefined = undefined
      
      if (bannerImage.length > 0) {
        const imageUrl = bannerImage[0]
        
        // Check if it's a blob URL (new upload) or existing URL
        if (imageUrl.startsWith('blob:')) {
          // Convert blob URL back to File for upload
          const response = await fetch(imageUrl)
          const blob = await response.blob()
          const file = new File([blob], 'banner-image.jpg', { type: blob.type })
          
          // Upload the image
          imagePath = await uploadEventImage(file)
        } else {
          // Use existing image URL
          imagePath = imageUrl
        }
      }

      const eventData = {
        title: formData.title.trim(),
        category: formData.category.trim(),
        description: formData.description.trim() || undefined,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        lat: formData.lat,
        lon: formData.lon,
        imagePath
      }

      await onSubmit(eventData)
    } catch (error) {
      console.error('Error submitting event:', error)
      setErrors({ submit: 'Failed to create event. Please try again.' })
    } finally {
      setImageUploading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleLocationSelect = (selectedLocation: { lat: number; lng: number }) => {
    setFormData(prev => ({
      ...prev,
      lat: selectedLocation.lat,
      lon: selectedLocation.lng
    }))
  }

  const handleUsePrimaryBusinessLocation = () => {
    if (!primaryBusinessLocation) return
    setFormData(prev => ({
      ...prev,
      lat: primaryBusinessLocation.lat,
      lon: primaryBusinessLocation.lon
    }))
  }

  const handleImageChange = useCallback((urls: string[]) => {
    console.log('EventForm received image URLs:', urls)
    // Only update if URLs have actually changed
    setBannerImage(prev => {
      if (prev.length === urls.length && prev.every((url, index) => url === urls[index])) {
        return prev // No change, return same reference
      }
      return urls
    })
  }, [])

  // Clear image errors when bannerImage changes
  useEffect(() => {
    if (errors.image && bannerImage.length > 0) {
      setErrors(prev => ({ ...prev, image: '' }))
    }
  }, [bannerImage.length, errors.image])

  return (
    <div className="event-form-container">
      <div className="event-form-map-column">
        <div className="event-form-map-header">
          <div className="event-form-map-header-text">
            <h3>📍 Pin Location</h3>
            <p className="map-instruction">Click on the map to set the event location.</p>
          </div>
          {primaryBusinessLocation && (
            <button
              type="button"
              className="use-primary-location-btn"
              onClick={handleUsePrimaryBusinessLocation}
              disabled={isLoading}
            >
              Use Primary Business Location
            </button>
          )}
        </div>
        <div className="map-wrapper">
          <LocationPickerMap
            ref={mapRef}
            initialLocation={{ lat: formData.lat, lng: formData.lon }}
            onLocationSelect={handleLocationSelect}
          />
        </div>
        <div className="selected-coordinates">
          <small>Selected: {formData.lat.toFixed(6)}, {formData.lon.toFixed(6)}</small>
        </div>
      </div>

      <div className="event-form-fields-column">
        <form className="event-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Event Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter event title"
              className={errors.title ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={errors.category ? 'error' : ''}
              disabled={isLoading}
            >
              <option value="">Select a category</option>
              <option value="Music">Music</option>
              <option value="Food">Food & Dining</option>
              <option value="Sports">Sports</option>
              <option value="Arts">Arts & Culture</option>
              <option value="Business">Business</option>
              <option value="Education">Education</option>
              <option value="Community">Community</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && <span className="error-message">{errors.category}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your event (optional)"
              rows={4}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Banner Image</label>
            {console.log('EventForm rendering with bannerImage:', bannerImage)}
            <ImageUpload
              mode="single"
              onImagesChange={handleImageChange}
              initialImages={bannerImage}
              disabled={isLoading || imageUploading}
              className="event-form__image-upload"
              maxSizeBytes={10 * 1024 * 1024} // 10MB
            />
            {errors.image && <span className="error-message">{errors.image}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                className={errors.startTime ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.startTime && <span className="error-message">{errors.startTime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time *</label>
              <input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                className={errors.endTime ? 'error' : ''}
                disabled={isLoading}
              />
              {errors.endTime && <span className="error-message">{errors.endTime}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="cancel-btn"
              disabled={isLoading || imageUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading || imageUploading}
            >
              {isLoading || imageUploading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
            </button>
          </div>

          {errors.submit && (
            <div className="error-message" role="alert">
              {errors.submit}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default EventForm