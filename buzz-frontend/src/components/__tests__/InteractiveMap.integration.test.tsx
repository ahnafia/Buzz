import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import InteractiveMap from '../InteractiveMap'
import { api } from '../../utils/api'
import type { Event, Flag } from '../../types/api'

// Mock the API
vi.mock('../../utils/api', () => ({
  api: {
    getEvents: vi.fn(),
    getProfileFlags: vi.fn(),
    getMyEvents: vi.fn(),
    getFollowingFlags: vi.fn(),
    getUserFlags: vi.fn()
  }
}))

// Mock UserContext
vi.mock('../../contexts/UserContext', () => ({
  useUser: () => ({
    currentUserId: 'user-123',
    currentUsername: 'testuser'
  })
}))

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      getCenter: vi.fn(() => ({ lat: 40.7934, lng: -77.8616 })),
      getZoom: vi.fn(() => 13),
      invalidateSize: vi.fn()
    })),
    tileLayer: vi.fn(() => ({
      addTo: vi.fn()
    })),
    marker: vi.fn(() => ({
      addTo: vi.fn(),
      bindPopup: vi.fn(),
      openPopup: vi.fn(),
      closePopup: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      remove: vi.fn()
    })),
    divIcon: vi.fn(() => ({})),
    popup: vi.fn(() => ({
      setContent: vi.fn(),
      openOn: vi.fn()
    }))
  }
}))

const renderInteractiveMap = (props: Partial<Parameters<typeof InteractiveMap>[0]> = {}) => {
  return render(
    <BrowserRouter>
      <InteractiveMap {...props} />
    </BrowserRouter>
  )
}

describe('InteractiveMap Integration Tests - Image Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock DOM methods
    Object.defineProperty(window, 'getComputedStyle', {
      value: () => ({
        getPropertyValue: () => ''
      })
    })
    
    // Mock container element
    const mockContainer = document.createElement('div')
    vi.spyOn(document, 'createElement').mockReturnValue(mockContainer)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should display event banner image in popup', async () => {
    const mockEvents: Event[] = [
      {
        id: 'event-1',
        title: 'Music Festival',
        category: 'Music',
        description: 'A great music festival',
        startTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lat: 40.7128,
        lon: -74.0060,
        imagePath: 'https://example.com/music-festival-banner.jpg',
        owner: 'Event Organizer'
      }
    ]

    vi.mocked(api.getEvents).mockResolvedValue(mockEvents)
    vi.mocked(api.getProfileFlags).mockResolvedValue([])
    vi.mocked(api.getMyEvents).mockResolvedValue([])
    vi.mocked(api.getFollowingFlags).mockResolvedValue([])

    renderInteractiveMap()

    // Wait for events to load
    await waitFor(() => {
      expect(api.getEvents).toHaveBeenCalled()
    })

    // Simulate clicking on event marker to open popup
    const eventPin = screen.getByText('Music Festival')
    await userEvent.click(eventPin)

    // Verify popup contains event banner image
    await waitFor(() => {
      const bannerImage = screen.getByAltText(/music festival banner image/i)
      expect(bannerImage).toBeInTheDocument()
      expect(bannerImage).toHaveAttribute('src', 'https://example.com/music-festival-banner.jpg')
    })

    // Verify popup has proper event details
    expect(screen.getByText('Music Festival')).toBeInTheDocument()
    expect(screen.getByText('A great music festival')).toBeInTheDocument()
    expect(screen.getByText(/view event details/i)).toBeInTheDocument()
  })

  it('should display event popup without image section when no banner exists', async () => {
    const mockEvents: Event[] = [
      {
        id: 'event-2',
        title: 'Community Meetup',
        category: 'Community',
        description: 'Local community gathering',
        startTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lat: 40.7128,
        lon: -74.0060,
        imagePath: undefined, // No banner image
        owner: 'Community Leader'
      }
    ]

    vi.mocked(api.getEvents).mockResolvedValue(mockEvents)
    vi.mocked(api.getProfileFlags).mockResolvedValue([])
    vi.mocked(api.getMyEvents).mockResolvedValue([])
    vi.mocked(api.getFollowingFlags).mockResolvedValue([])

    renderInteractiveMap()

    // Wait for events to load
    await waitFor(() => {
      expect(api.getEvents).toHaveBeenCalled()
    })

    // Simulate clicking on event marker
    const eventPin = screen.getByText('Community Meetup')
    await userEvent.click(eventPin)

    // Verify popup does not contain image section
    await waitFor(() => {
      expect(screen.queryByAltText(/banner image/i)).not.toBeInTheDocument()
      expect(screen.queryByClassName(/buzz-popup-image-container/)).not.toBeInTheDocument()
    })

    // Verify popup still has event details
    expect(screen.getByText('Community Meetup')).toBeInTheDocument()
    expect(screen.getByText('Local community gathering')).toBeInTheDocument()
  })

  it('should display flag images in carousel within popup', async () => {
    const mockFlags: Flag[] = [
      {
        id: 'flag-1',
        title: 'Beautiful Sunset',
        description: 'Amazing sunset photos',
        lat: 40.7128,
        lon: -74.0060,
        userId: 'user-456',
        imageUrl: 'https://example.com/sunset1.jpg,https://example.com/sunset2.jpg,https://example.com/sunset3.jpg',
        imagePaths: ['https://example.com/sunset1.jpg', 'https://example.com/sunset2.jpg', 'https://example.com/sunset3.jpg'],
        color: '#FF9B56',
        category: 'Nature',
        addressText: 'Central Park',
        city: 'New York',
        isPublic: true,
        createdAt: new Date().toISOString()
      }
    ]

    vi.mocked(api.getProfileFlags).mockResolvedValue(mockFlags)
    vi.mocked(api.getEvents).mockResolvedValue([])
    vi.mocked(api.getMyEvents).mockResolvedValue([])
    vi.mocked(api.getFollowingFlags).mockResolvedValue([])

    renderInteractiveMap()

    // Wait for flags to load
    await waitFor(() => {
      expect(api.getProfileFlags).toHaveBeenCalled()
    })

    // Simulate clicking on flag marker
    const flagPin = screen.getByText('Beautiful Sunset')
    await userEvent.click(flagPin)

    // Verify popup contains flag image carousel
    await waitFor(() => {
      const carousel = screen.getByClassName(/buzz-popup-flag-carousel/)
      expect(carousel).toBeInTheDocument()
    })

    // Verify first image is displayed
    const firstImage = screen.getByAltText(/flag image 1 of 3/i)
    expect(firstImage).toBeInTheDocument()
    expect(firstImage).toHaveAttribute('src', 'https://example.com/sunset1.jpg')

    // Verify navigation controls are present
    expect(screen.getByLabelText(/previous image/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/next image/i)).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    // Verify thumbnails are present (for <= 5 images)
    const thumbnails = screen.getAllByLabelText(/go to image/i)
    expect(thumbnails).toHaveLength(3)
  })

  it('should navigate flag carousel images in popup', async () => {
    const mockFlags: Flag[] = [
      {
        id: 'flag-2',
        title: 'City Views',
        description: 'Multiple city photos',
        lat: 40.7128,
        lon: -74.0060,
        userId: 'user-456',
        imageUrl: 'https://example.com/city1.jpg,https://example.com/city2.jpg',
        imagePaths: ['https://example.com/city1.jpg', 'https://example.com/city2.jpg'],
        color: '#64B9D3',
        category: 'Urban',
        addressText: 'Downtown',
        city: 'New York',
        isPublic: true,
        createdAt: new Date().toISOString()
      }
    ]

    vi.mocked(api.getProfileFlags).mockResolvedValue(mockFlags)
    vi.mocked(api.getEvents).mockResolvedValue([])
    vi.mocked(api.getMyEvents).mockResolvedValue([])
    vi.mocked(api.getFollowingFlags).mockResolvedValue([])

    // Mock global carousel functions
    const mockCarouselNext = vi.fn()
    const mockCarouselPrev = vi.fn()
    const mockCarouselGoTo = vi.fn()
    
    Object.assign(window, {
      buzzFlagCarouselNext: mockCarouselNext,
      buzzFlagCarouselPrev: mockCarouselPrev,
      buzzFlagCarouselGoTo: mockCarouselGoTo
    })

    renderInteractiveMap()

    // Wait for flags to load
    await waitFor(() => {
      expect(api.getProfileFlags).toHaveBeenCalled()
    })

    // Simulate clicking on flag marker
    const flagPin = screen.getByText('City Views')
    await userEvent.click(flagPin)

    // Wait for carousel to appear
    await waitFor(() => {
      expect(screen.getByClassName(/buzz-popup-flag-carousel/)).toBeInTheDocument()
    })

    // Test next button
    const nextBtn = screen.getByLabelText(/next image/i)
    await userEvent.click(nextBtn)
    
    expect(mockCarouselNext).toHaveBeenCalledWith('flag-2')

    // Test previous button
    const prevBtn = screen.getByLabelText(/previous image/i)
    await userEvent.click(prevBtn)
    
    expect(mockCarouselPrev).toHaveBeenCalledWith('flag-2')

    // Test thumbnail navigation
    const secondThumbnail = screen.getByLabelText(/go to image 2/i)
    await userEvent.click(secondThumbnail)
    
    expect(mockCarouselGoTo).toHaveBeenCalledWith('flag-2', 1)
  })

  it('should display flag popup without image section when no images exist', async () => {
    const mockFlags: Flag[] = [
      {
        id: 'flag-3',
        title: 'Text Only Flag',
        description: 'A flag with no images',
        lat: 40.7128,
        lon: -74.0060,
        userId: 'user-456',
        imageUrl: undefined, // No images
        imagePaths: undefined,
        color: '#F7CA1D',
        category: 'General',
        addressText: 'Somewhere',
        city: 'New York',
        isPublic: true,
        createdAt: new Date().toISOString()
      }
    ]

    vi.mocked(api.getProfileFlags).mockResolvedValue(mockFlags)
    vi.mocked(api.getEvents).mockResolvedValue([])
    vi.mocked(api.getMyEvents).mockResolvedValue([])
    vi.mocked(api.getFollowingFlags).mockResolvedValue([])

    renderInteractiveMap()

    // Wait for flags to load
    await waitFor(() => {
      expect(api.getProfileFlags).toHaveBeenCalled()
    })

    // Simulate clicking on flag marker
    const flagPin = screen.getByText('Text Only Flag')
    await userEvent.click(flagPin)

    // Verify popup does not contain image carousel
    await waitFor(() => {
      expect(screen.queryByClassName(/buzz-popup-flag-carousel/)).not.toBeInTheDocument()
      expect(screen.queryByAltText(/flag image/i)).not.toBeInTheDocument()
    })

    // Verify popup still has flag details
    expect(screen.getByText('Text Only Flag')).toBeInTheDocument()
    expect(screen.getByText('A flag with no images')).toBeInTheDocument()
  })

  it('should handle image loading errors in event popup', async () => {
    const mockEvents: Event[] = [
      {
        id: 'event-3',
        title: 'Event with Broken Image',
        category: 'Test',
        description: 'Event with broken banner',
        startTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lat: 40.7128,
        lon: -74.0060,
        imagePath: 'https://example.com/broken-image.jpg',
        owner: 'Test User'
      }
    ]

    vi.mocked(api.getEvents).mockResolvedValue(mockEvents)
    vi.mocked(api.getProfileFlags).mockResolvedValue([])
    vi.mocked(api.getMyEvents).mockResolvedValue([])
    vi.mocked(api.getFollowingFlags).mockResolvedValue([])

    renderInteractiveMap()

    // Wait for events to load
    await waitFor(() => {
      expect(api.getEvents).toHaveBeenCalled()
    })

    // Simulate clicking on event marker
    const eventPin = screen.getByText('Event with Broken Image')
    await userEvent.click(eventPin)

    // Wait for popup to appear
    await waitFor(() => {
      const bannerImage = screen.getByAltText(/banner image/i)
      expect(bannerImage).toBeInTheDocument()
    })

    // Simulate image load error
    const bannerImage = screen.getByAltText(/banner image/i)
    fireEvent.error(bannerImage)

    // Verify fallback is shown
    await waitFor(() => {
      expect(screen.getByText(/image unavailable/i)).toBeInTheDocument()
    })
  })

  it('should handle image loading errors in flag carousel', async () => {
    const mockFlags: Flag[] = [
      {
        id: 'flag-4',
        title: 'Flag with Broken Images',
        description: 'Flag with some broken images',
        lat: 40.7128,
        lon: -74.0060,
        userId: 'user-456',
        imageUrl: 'https://example.com/broken1.jpg,https://example.com/broken2.jpg',
        imagePaths: ['https://example.com/broken1.jpg', 'https://example.com/broken2.jpg'],
        color: '#FF5B59',
        category: 'Test',
        addressText: 'Test Location',
        city: 'Test City',
        isPublic: true,
        createdAt: new Date().toISOString()
      }
    ]

    vi.mocked(api.getProfileFlags).mockResolvedValue(mockFlags)
    vi.mocked(api.getEvents).mockResolvedValue([])
    vi.mocked(api.getMyEvents).mockResolvedValue([])
    vi.mocked(api.getFollowingFlags).mockResolvedValue([])

    renderInteractiveMap()

    // Wait for flags to load
    await waitFor(() => {
      expect(api.getProfileFlags).toHaveBeenCalled()
    })

    // Simulate clicking on flag marker
    const flagPin = screen.getByText('Flag with Broken Images')
    await userEvent.click(flagPin)

    // Wait for carousel to appear
    await waitFor(() => {
      const carousel = screen.getByClassName(/buzz-popup-flag-carousel/)
      expect(carousel).toBeInTheDocument()
    })

    // Simulate image load error
    const flagImage = screen.getByAltText(/flag image 1 of 2/i)
    fireEvent.error(flagImage)

    // Verify error state is shown
    await waitFor(() => {
      expect(screen.getByText(/failed to load image/i)).toBeInTheDocument()
    })
  })

  it('should display single flag image without navigation controls', async () => {
    const mockFlags: Flag[] = [
      {
        id: 'flag-5',
        title: 'Single Image Flag',
        description: 'Flag with only one image',
        lat: 40.7128,
        lon: -74.0060,
        userId: 'user-456',
        imageUrl: 'https://example.com/single.jpg',
        imagePaths: ['https://example.com/single.jpg'],
        color: '#64B9D3',
        category: 'Photo',
        addressText: 'Photo Spot',
        city: 'New York',
        isPublic: true,
        createdAt: new Date().toISOString()
      }
    ]

    vi.mocked(api.getProfileFlags).mockResolvedValue(mockFlags)
    vi.mocked(api.getEvents).mockResolvedValue([])
    vi.mocked(api.getMyEvents).mockResolvedValue([])
    vi.mocked(api.getFollowingFlags).mockResolvedValue([])

    renderInteractiveMap()

    // Wait for flags to load
    await waitFor(() => {
      expect(api.getProfileFlags).toHaveBeenCalled()
    })

    // Simulate clicking on flag marker
    const flagPin = screen.getByText('Single Image Flag')
    await userEvent.click(flagPin)

    // Verify carousel shows single image
    await waitFor(() => {
      const flagImage = screen.getByAltText(/flag image 1 of 1/i)
      expect(flagImage).toBeInTheDocument()
      expect(flagImage).toHaveAttribute('src', 'https://example.com/single.jpg')
    })

    // Verify no navigation controls are present for single image
    expect(screen.queryByLabelText(/previous image/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/next image/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument()
  })
})