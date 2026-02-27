import { useState, useRef, useEffect } from 'react'
import './SearchBar.css'

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading: boolean
  placeholder?: string
  disabled?: boolean
}

const SearchBar = ({ 
  onSearch, 
  isLoading, 
  placeholder = "Search for events...", 
  disabled = false 
}: SearchBarProps) => {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Clear error when user starts typing
  useEffect(() => {
    if (error && query.trim()) {
      setError(null)
    }
  }, [query, error])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedQuery = query.trim()
    
    // Validate query
    if (!trimmedQuery) {
      setError('Please enter a search term')
      inputRef.current?.focus()
      return
    }

    if (trimmedQuery.length < 2) {
      setError('Search term must be at least 2 characters')
      inputRef.current?.focus()
      return
    }

    // Clear any existing error and perform search
    setError(null)
    onSearch(trimmedQuery)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  const handleClear = () => {
    setQuery('')
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-bar-form">
        <div className="search-bar-input-container">
          <div className="search-bar-input-wrapper">
            <svg 
              className="search-bar-icon" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder={placeholder}
              className={`search-bar-input ${error ? 'search-bar-input--error' : ''}`}
              disabled={disabled || isLoading}
              aria-label="Search events"
              aria-describedby={error ? 'search-error' : undefined}
            />
            
            {query && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="search-bar-clear"
                aria-label="Clear search"
                disabled={disabled}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            
            {isLoading && (
              <div className="search-bar-loading" aria-label="Searching...">
                <svg className="search-bar-spinner" viewBox="0 0 24 24">
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
            )}
          </div>
          
          <button
            type="submit"
            className="search-bar-submit"
            disabled={disabled || isLoading || !query.trim()}
            aria-label="Search"
          >
            {isLoading ? (
              <svg className="search-bar-spinner" viewBox="0 0 24 24">
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
            ) : (
              'Search'
            )}
          </button>
        </div>
        
        {error && (
          <div id="search-error" className="search-bar-error" role="alert">
            {error}
          </div>
        )}
      </form>
    </div>
  )
}

export default SearchBar