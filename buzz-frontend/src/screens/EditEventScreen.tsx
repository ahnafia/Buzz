import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBusinessEvents } from '../hooks/useProfile'
import EventForm from '../components/EventForm'
import type { UpdateEventRequest, Event } from '../types/api'
import './EditEventScreen.css'

const EditEventScreen = () => {
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  const { events, updateEvent } = useBusinessEvents()
  const [isLoading, setIsLoading] = useState(false)
  const [event, setEvent] = useState<Event | null>(null)

  useEffect(() => {
    if (eventId && events.length > 0) {
      const foundEvent = events.find(e => e.id === eventId)
      setEvent(foundEvent || null)
    }
  }, [eventId, events])

  const handleSubmit = async (eventData: UpdateEventRequest) => {
    if (!eventId) return

    setIsLoading(true)
    try {
      await updateEvent(eventId, eventData)
      navigate('/profile') // Navigate back to profile
    } catch (error) {
      console.error('Failed to update event:', error)
      alert('Failed to update event. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  if (!eventId) {
    return (
      <div className="edit-event-screen">
        <div className="edit-event-header">
          <Link to="/profile" className="back-btn">← Back</Link>
          <h1>Edit Event</h1>
        </div>
        <div className="error-message">
          <p>Event ID not provided</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="edit-event-screen">
        <div className="edit-event-header">
          <Link to="/profile" className="back-btn">← Back</Link>
          <h1>Edit Event</h1>
        </div>
        <div className="loading-event">
          <p>Loading event...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="edit-event-screen">
      <div className="edit-event-header">
        <Link to="/profile" className="back-btn">← Back</Link>
        <h1>Edit Event</h1>
      </div>

      <div className="edit-event-body">
        <EventForm
          event={event}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

export default EditEventScreen