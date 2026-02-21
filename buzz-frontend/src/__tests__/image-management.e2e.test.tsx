import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import App from '../App'
import { api } from '../utils/api'
import { uploadEventImage, uploadFlagImages } from '../utils/storage'
import type { Event, Flag } from '../types/api'

// Mock all external dependencies
vi.mock('../utils/api', () => ({
  api: {
    getEvents: vi.fn(),
    getProfileFlags: vi.fn(),
    getMyEvents: vi.fn(),
    getFollowingFlags: vi.fn(),
    getUserFlags: vi.fn(),
    createEvent: vi.fn(),
    createFlag: vi.fn(),
    getProfile: vi.fn()
  }
}))

vi.mock('../utils/storage', () => ({
  uploadEventImage: vi.fn(),
  uploadFlagImages: vi.fn()
}))

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    currentUserId: 'user-123',
    currentUsername: 'testuser',
    isAuthenticated: true
  }),
  UserProvider: ({ children }: { children: React.ReactNode }) => children
}))

// Simple mock for components that might cause issues
vi.mock('../components/InteractiveMap', () => ({
  default: () => <div data-testid="interactive-map">Map Component</div>
}))

vi.mock('../components/LocationPickerMap', () => ({
  default: ({ onLocationSelect }: { onLocationSelect: (loc: { lat: number; lng: number }) => void }) => (
    <div data-testid="location-picker-map">
      <button 
        onClick={() => onLocationSelect({ lat: 40.7128, lng: -74.0060 })}
        data-testid="select-location-btn"
      >
        Select Location
      </button>
    </div>
  )
}))

const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

describe('Image Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default API responses
    vi.mocked(api.getEvents).mockResolvedValue([])
    vi.mocked(api.getProfileFlags).mockResolvedValue([])
    vi.mocked(api.getMyEvents).mockResolvedValue([])
    vi.mocked(api.getFollowingFlags).mockResolvedValue([])
    vi.mocked(api.getProfile).mockResolvedValue({
      id: 'user-123',
      username: 'testuser',
      displayName: 'Test User',
      lat: 40.7934,
      lon: -77.8616
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should complete flag creation with image upload', async () => {
    const user = userEvent.setup()
    
    // Mock successful upload and creation
    const mockUploadedUrl = 'https://example.com/flag-image.jpg'
    const mockCreatedFlag: Flag = {
      id: 'flag-123',
      title: 'Test Flag',
      description: 'Test flag with image',
      lat: 40.7128,
      lon: -74.0060,
      userId: 'user-123',
      imagePaths: [mockUploadedUrl],
      imageUrl: mockUploadedUrl,
      color: '#FF9B56',
      category: 'test',
      addressText: 'Test Location',
      city: 'Test City',
      isPublic: true,
      createdAt: new Date().toISOString()
    }

    vi.mocked(uploadFlagImages).mockResolvedValue([mockUploadedUrl])
    vi.mocked(api.createFlag).mockResolvedValue(mockCreatedFlag)

    renderApp()

    // Navigate to flag creation
    const createFlagBtn = screen.getByText(/create flag/i)
    await user.click(createFlagBtn)

    // Fill in basic details
    const nameInput = screen.getByPlaceholderText(/enter flag name/i)
    await user.type(nameInput, 'Test Flag')

    // Upload image
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    // Submit
    const generateBtn = screen.getByText(/generate/i)
    await user.click(generateBtn)

    // Verify upload and creation
    await waitFor(() => {
      expect(uploadFlagImages).toHaveBeenCalledWith([expect.objectContaining({ name: 'test.jpg' })])
      expect(api.createFlag).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Flag',
        imagePaths: [mockUploadedUrl]
      }))
    })
  })

  it('should complete event creation with banner image', async () => {
    const user = userEvent.setup()
    
    // Mock successful upload and creation
    const mockBannerUrl = 'https://example.com/event-banner.jpg'
    const mockCreatedEvent: Event = {
      id: 'event-123',
      title: 'Test Event',
      category: 'Music',
      description: 'Test event with banner',
      startTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      lat: 40.7128,
      lon: -74.0060,
      imagePath: mockBannerUrl,
      owner: 'testuser'
    }

    vi.mocked(uploadEventImage).mockResolvedValue(mockBannerUrl)
    vi.mocked(api.createEvent).mockResolvedValue(mockCreatedEvent)

    renderApp()

    // Navigate to event creation
    const createEventBtn = screen.getByText(/create event/i)
    await user.click(createEventBtn)

    // Fill in event details
    const titleInput = screen.getByLabelText(/event title/i)
    await user.type(titleInput, 'Test Event')

    // Upload banner
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const bannerFile = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, bannerFile)

    // Submit
    const createBtn = screen.getByText(/create event/i)
    await user.click(createBtn)

    // Verify upload and creation
    await waitFor(() => {
      expect(uploadEventImage).toHaveBeenCalledWith(expect.objectContaining({ name: 'banner.jpg' }))
      expect(api.createEvent).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Event',
        imagePath: mockBannerUrl
      }))
    })
  })

  it('should handle upload errors with retry functionality', async () => {
    const user = userEvent.setup()
    
    // Mock initial failure, then success
    vi.mocked(uploadFlagImages)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(['https://example.com/retry-success.jpg'])

    renderApp()

    // Navigate to flag creation
    const createFlagBtn = screen.getByText(/create flag/i)
    await user.click(createFlagBtn)

    // Upload image
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    // Submit and expect failure
    const generateBtn = screen.getByText(/generate/i)
    await user.click(generateBtn)

    // Wait for error and retry
    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
    })

    const retryBtn = screen.getByText(/retry/i)
    await user.click(retryBtn)

    // Verify retry was attempted
    await waitFor(() => {
      expect(uploadFlagImages).toHaveBeenCalledTimes(2)
    })
  })

  it('should validate file types during upload', async () => {
    const user = userEvent.setup()

    renderApp()

    // Navigate to flag creation
    const createFlagBtn = screen.getByText(/create flag/i)
    await user.click(createFlagBtn)

    // Try to upload invalid file type
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const invalidFile = new File(['text'], 'document.txt', { type: 'text/plain' })
    
    await user.upload(fileInput, invalidFile)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/file type.*not supported/i)).toBeInTheDocument()
    })

    // Verify no API calls were made
    expect(uploadFlagImages).not.toHaveBeenCalled()
  })
})