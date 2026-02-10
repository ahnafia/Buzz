import { useState, useEffect, useRef } from 'react'
import LocationPickerMap, { type LocationPickerMapHandle } from './LocationPickerMap'
import type { Event, CreateEventRequest, UpdateEventRequest } from '../types/api'
import './EventForm.css'
import './LocationPickerMap.css'

interface EventFormProps {
  event?: Event
  onSubmit: (eventData: CreateEventRequest | UpdateEventRequest) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  location?: { lat: number; lon: number }
}

const EventForm = ({ event, onSubmit, onCancel, isLoading = false, location }: EventFormProps) => {
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
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const mapRef = useRef<LocationPickerMapHandle>(null)

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
      const eventData = {
        title: formData.title.trim(),
        category: formData.category.trim(),
        description: formData.description.trim() || undefined,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        lat: formData.lat,
        lon: formData.lon
      }

      await onSubmit(eventData)
    } catch (error) {
      console.error('Error submitting event:', error)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleLocationPicker = () => {
    console.log('EventForm: Opening location picker modal')
    setShowLocationPicker(true)
  }

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    setFormData(prev => ({
      ...prev,
      lat: location.lat,
      lon: location.lng
    }))
  }

  const handleLocationConfirm = () => {
    const selectedLocation = mapRef.current?.getSelectedLocation()
    if (selectedLocation) {
      setFormData(prev => ({
        ...prev,
        lat: selectedLocation.lat,
        lon: selectedLocation.lng
      }))
    }
    setShowLocationPicker(false)
  }

  const handleLocationCancel = () => {
    setShowLocationPicker(false)
  }

  return (
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
          rows={3}
          disabled={isLoading}
        />
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

      <div className="form-group">
        <label>Event Location *</label>
        <div className="location-section">
          <div className="location-info">
            <p>📍 {formData.lat.toFixed(6)}, {formData.lon.toFixed(6)}</p>
            <button
              type="button"
              onClick={handleLocationPicker}
              className="location-picker-btn"
              disabled={isLoading}
            >
              📍 Choose Location on Map
            </button>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="cancel-btn"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </button>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="location-picker-modal">
          <div className="location-picker-content">
            <div className="location-picker-header">
              <h3>Choose Event Location</h3>
              <p>Tap on the map to select where your event will take place</p>
              <p style={{ color: 'red', fontSize: '12px' }}>DEBUG: Modal is open</p>
            </div>
            <div className="location-picker-map">
              <LocationPickerMap 
                ref={mapRef}
                initialLocation={{ lat: formData.lat, lng: formData.lon }}
                onLocationSelect={handleLocationSelect}
              />
            </div>
            <div className="location-picker-actions">
              <button
                type="button"
                onClick={handleLocationCancel}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLocationConfirm}
                className="confirm-btn"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

export default EventForm