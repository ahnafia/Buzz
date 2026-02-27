import { useNavigate } from 'react-router-dom'
import type { Event } from '../types/api'
import EventImage from './EventImage'
import './SearchResults.css'

interface SearchResultsProps {
  events: Event[]
  isLoading: boolean
  error?: string | null
  onLoadMore?: () => void
  hasMore?: boolean
  searchQuery?: string
}

const SearchResults = ({ 
  events, 
  isLoading, 
  error, 
  onLoadMore, 
  hasMore = false,
  searchQuery 
}: SearchResultsProps) => {
  const navigate = useNavigate()

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`)
  }

  const formatEventTime = (startTime: string, expiresAt: string) => {
    const start = new Date(startTime)
    const end = new Date(expiresAt)
    const now = new Date()
    
    const isToday = start.toDateString() === now.toDateString()
    const isTomorrow = start.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()
    
    let dateStr = ''
    if (isToday) {
      dateStr = 'Today'
    } else if (isTomorrow) {
      dateStr = 'Tomorrow'
    } else {
      dateStr = start.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }
    
    const timeStr = start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    
    return `${dateStr} at ${timeStr}`
  }

  const getEventStatus = (startTime: string, expiresAt: string) => {
    const now = new Date()
    const start = new Date(startTime)
    const end = new Date(expiresAt)
    
    if (now > end) return 'expired'
    if (now < start) return 'upcoming'
    return 'active'
  }

  // Loading state
  if (isLoading && events.length === 0) {
    return (
      <div className="search-results">
        <div className="search-results-loading">
          <div className="search-results-spinner" aria-label="Searching for events...">
            <svg viewBox="0 0 24 24">
              <circle 
                cx="12" 
                cy="12" 
                r="10" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
                strokeDasharray="31.416"
                strokeDashoffset="31.416"
              />
            </svg>
          </div>
          <p>Searching for events...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="search-results">
        <div className="search-results-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <div>
            <h3>Search Error</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Empty results
  if (!isLoading && events.length === 0) {
    return (
      <div className="search-results">
        <div className="search-results-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <div>
            <h3>No events found</h3>
            <p>
              {searchQuery 
                ? `No events match "${searchQuery}". Try different keywords or check your location settings.`
                : 'No events match your search. Try different keywords or check your location settings.'
              }
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="search-results">
      {searchQuery && (
        <div className="search-results-header">
          <h2>Search Results for "{searchQuery}"</h2>
          <p>{events.length} event{events.length !== 1 ? 's' : ''} found</p>
        </div>
      )}
      
      <div className="search-results-list">
        {events.map((event) => {
          const status = getEventStatus(event.startTime, event.expiresAt)
          
          return (
            <div
              key={event.id}
              className={`search-result-card search-result-card--${status}`}
              onClick={() => handleEventClick(event.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleEventClick(event.id)
                }
              }}
              aria-label={`View event: ${event.title}`}
            >
              <div className="search-result-image">
                {event.imagePath ? (
                  <EventImage
                    src={event.imagePath}
                    alt={event.title}
                    className="search-result-event-image"
                  />
                ) : (
                  <div className="search-result-image-placeholder">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                    </svg>
                  </div>
                )}
                
                <div className={`search-result-status search-result-status--${status}`}>
                  {status === 'expired' && 'Ended'}
                  {status === 'upcoming' && 'Upcoming'}
                  {status === 'active' && 'Live'}
                </div>
              </div>
              
              <div className="search-result-content">
                <div className="search-result-header">
                  <h3 className="search-result-title">{event.title}</h3>
                  <div className="search-result-category">{event.category}</div>
                </div>
                
                <div className="search-result-time">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  {formatEventTime(event.startTime, event.expiresAt)}
                </div>
                
                {event.description && (
                  <p className="search-result-description">
                    {event.description.length > 120 
                      ? `${event.description.substring(0, 120)}...` 
                      : event.description
                    }
                  </p>
                )}
                
                <div className="search-result-owner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Hosted by {event.owner}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {hasMore && onLoadMore && (
        <div className="search-results-load-more">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="search-results-load-more-btn"
          >
            {isLoading ? (
              <>
                <svg className="search-results-spinner" viewBox="0 0 24 24">
                  <circle 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    strokeDasharray="31.416"
                    strokeDashoffset="31.416"
                  />
                </svg>
                Loading more...
              </>
            ) : (
              'Load More Events'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default SearchResults