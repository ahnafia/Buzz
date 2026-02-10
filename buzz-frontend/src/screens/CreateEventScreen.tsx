import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBusinessEvents } from '../hooks/useProfile'
import EventForm from '../components/EventForm'
import type { CreateEventRequest } from '../types/api'
import './CreateEventScreen.css'

const CreateEventScreen = () => {
  const navigate = useNavigate()
  const { createEvent } = useBusinessEvents()
  const [isLoading, setIsLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          // Default to a fallback location (you might want to handle this better)
          setLocation({ lat: 40.7128, lon: -74.0060 }) // NYC as fallback
        }
      )
    } else {
      // Geolocation not supported, use fallback
      setLocation({ lat: 40.7128, lon: -74.0060 })
    }
  }, [])

  const handleSubmit = async (eventData: CreateEventRequest) => {
    if (!location) {
      alert('Location is required to create an event')
      return
    }

    setIsLoading(true)
    try {
      await createEvent(eventData)
      navigate('/profile') // Navigate back to profile
    } catch (error) {
      console.error('Failed to create event:', error)
      alert('Failed to create event. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  if (!location) {
    return (
      <div className="create-event-screen">
        <div className="create-event-header">
          <Link to="/profile" className="back-btn">← Back</Link>
          <h1>Create Event</h1>
        </div>
        <div className="loading-location">
          <p>Getting your location...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="create-event-screen">
      <div className="create-event-header">
        <Link to="/profile" className="back-btn">← Back</Link>
        <h1>Create Event</h1>
      </div>

      <div className="create-event-body">
        <EventForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          location={location}
        />
      </div>
    </div>
  )
}

export default CreateEventScreen