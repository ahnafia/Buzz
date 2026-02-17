import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import type { Event, UserProfile } from '../types/api'
import './EventDetailsScreen.css'

export default function EventDetailsScreen() {
    const { eventId } = useParams<{ eventId: string }>()
    const navigate = useNavigate()
    const [event, setEvent] = useState<Event | null>(null)
    const [host, setHost] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadData = async () => {
            if (!eventId) return

            try {
                setLoading(true)
                // Fetch event details
                const eventData = await api.getEvent(eventId)
                if (!eventData) {
                    setError('Event not found')
                    setLoading(false)
                    return
                }
                setEvent(eventData)

                // Fetch host details if owner ID is present
                if (eventData.owner) {
                    try {
                        // Try fetching as user ID first
                        const hostData = await api.getUserById(eventData.owner)
                        if (hostData) {
                            setHost(hostData)
                        } else {
                            // If not found by ID, maybe it's a username (legacy data?), try public profile
                            // But getting public profile uses username, not ID. 
                            // We'll assume owner is ID as per modern schema.
                            // If it fails, we just don't show host details or show "Unknown User"
                        }
                    } catch (e) {
                        console.warn('Could not fetch host details:', e)
                    }
                }
            } catch (err) {
                console.error('Error loading event details:', err)
                setError('Failed to load event')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [eventId])

    if (loading) {
        return (
            <div className="event-details-screen">
                <div className="event-details-loading">
                    <div className="event-details-loading-spinner" />
                    <p>Loading event...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="event-details-screen">
                <div className="event-details-header">
                    <button className="event-details-back-btn" onClick={() => navigate(-1)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
                <div className="event-details-content">
                    <p>{error || 'Event not found'}</p>
                </div>
            </div>
        )
    }

    const startDate = new Date(event.startTime)
    const endDate = new Date(event.expiresAt)

    const dateStr = startDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    const timeStr = `${startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`

    return (
        <div className="event-details-screen">
            <div className="event-details-header">
                <button className="event-details-back-btn" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>

            <div className="event-details-hero">
                {event.imagePath ? (
                    <img
                        src={event.imagePath}
                        alt={event.title}
                        className="event-details-image"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                ) : null}
                <div className={`event-details-image-fallback ${event.imagePath ? 'hidden' : ''}`} style={{ display: event.imagePath ? 'none' : 'flex' }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                    </svg>
                </div>
            </div>

            <div className="event-details-content">
                <div className="event-details-title-row">
                    <h1 className="event-details-title">{event.title}</h1>
                    <span className="event-details-category">{event.category}</span>
                </div>

                <div className="event-details-host">
                    {host ? (
                        <>
                            <img
                                src={host.profileImageUrl || `https://ui-avatars.com/api/?name=${host.displayName || host.username}&background=random`}
                                alt={host.displayName}
                                className="event-details-host-avatar"
                            />
                            <span>Hosted by <strong>{host.displayName || host.username}</strong></span>
                        </>
                    ) : (
                        <span>Hosted by Buzz User</span>
                    )}
                </div>

                <div className="event-details-info-grid">
                    <div className="event-details-info-item">
                        <svg className="event-details-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <div>
                            <div>{dateStr}</div>
                            <div style={{ fontSize: '0.9em', color: '#aaa' }}>{timeStr}</div>
                        </div>
                    </div>

                    <div className="event-details-info-item">
                        <svg className="event-details-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <div>
                            {/* We might not have addressText in Event type yet based on api.ts view, let's check */}
                            {/* View api.ts showed Event interface has: id, title, category, startTime, expiresAt, owner, lat, lon, description, imagePath */}
                            {/* It does NOT have addressText. We can maybe reverse geocode or just show "View on Map" or coordinates if we really want, or just generic location */}
                            {/* I will add a placeholder or compute distance if I had user location, but here I'll just say "Buzz Event Location" or similar if no address is available */}
                            <div>Event Location</div>
                            <div style={{ fontSize: '0.9em', color: '#aaa' }}>Tap map to see location</div>
                        </div>
                    </div>
                </div>

                {event.description && (
                    <div className="event-details-section">
                        <h3 className="event-details-section-title">About</h3>
                        <p className="event-details-description">{event.description}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
