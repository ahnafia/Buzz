import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import EventForm from '../EventForm'
import { uploadEventImage } from '../../utils/storage'
import type { CreateEventRequest } from '../../types/api'

// Mock the storage utility
vi.mock('../../utils/storage', () => ({
  uploadEventImage: vi.fn()
}))

// Mock the LocationPickerMap component
vi.mock('../LocationPickerMap', () => ({
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

const renderEventForm = (props: Partial<Parameters<typeof EventForm>[0]> = {}) => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
    ...props
  }

  return render(
    <BrowserRouter>
      <EventForm {...defaultProps} />
    </BrowserRouter>
  )
}

describe('EventForm Integration Tests - Image Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create an event with banner image successfully', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = vi.fn()
    
    // Mock successful image upload
    const mockImageUrl = 'https://example.com/banner-image.jpg'
    vi.mocked(uploadEventImage).mockResolvedValue(mockImageUrl)

    renderEventForm({ onSubmit: mockOnSubmit })

    // Fill in required fields
    const titleInput = screen.getByLabelText(/event title/i)
    await user.type(titleInput, 'Test Event with Banner')

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, 'Music')

    const descriptionInput = screen.getByLabelText(/description/i)
    await user.type(descriptionInput, 'A test event with a banner image')

    // Set start and end times
    const startTimeInput = screen.getByLabelText(/start time/i)
    const endTimeInput = screen.getByLabelText(/end time/i)
    
    const startTime = new Date()
    startTime.setHours(startTime.getHours() + 1)
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + 2)

    await user.type(startTimeInput, startTime.toISOString().slice(0, 16))
    await user.type(endTimeInput, endTime.toISOString().slice(0, 16))

    // Select a location
    const selectLocationBtn = screen.getByTestId('select-location-btn')
    await user.click(selectLocationBtn)

    // Upload banner image
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const bannerFile = new File(['banner-image'], 'banner.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, bannerFile)

    // Wait for image to be processed and uploaded
    await waitFor(() => {
      expect(uploadEventImage).toHaveBeenCalledWith(expect.objectContaining({
        name: expect.stringContaining('banner')
      }))
    })

    // Submit the form
    const submitBtn = screen.getByText(/create event/i)
    await user.click(submitBtn)

    // Verify the event data includes the image path
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Test Event with Banner',
        category: 'Music',
        description: 'A test event with a banner image',
        startTime: expect.any(String),
        endTime: expect.any(String),
        lat: 40.7128,
        lon: -74.0060,
        imagePath: mockImageUrl
      })
    })
  })

  it('should create an event without banner image successfully', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = vi.fn()

    renderEventForm({ onSubmit: mockOnSubmit })

    // Fill in required fields only (no image)
    const titleInput = screen.getByLabelText(/event title/i)
    await user.type(titleInput, 'Test Event No Banner')

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, 'Community')

    // Set start and end times
    const startTimeInput = screen.getByLabelText(/start time/i)
    const endTimeInput = screen.getByLabelText(/end time/i)
    
    const startTime = new Date()
    startTime.setHours(startTime.getHours() + 1)
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + 2)

    await user.type(startTimeInput, startTime.toISOString().slice(0, 16))
    await user.type(endTimeInput, endTime.toISOString().slice(0, 16))

    // Select a location
    const selectLocationBtn = screen.getByTestId('select-location-btn')
    await user.click(selectLocationBtn)

    // Submit without adding image
    const submitBtn = screen.getByText(/create event/i)
    await user.click(submitBtn)

    // Verify the event data does not include imagePath
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Test Event No Banner',
        category: 'Community',
        description: undefined,
        startTime: expect.any(String),
        endTime: expect.any(String),
        lat: 40.7128,
        lon: -74.0060,
        imagePath: undefined
      })
    })

    // Verify uploadEventImage was not called
    expect(uploadEventImage).not.toHaveBeenCalled()
  })

  it('should handle banner image upload errors gracefully', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = vi.fn()
    
    // Mock upload failure
    vi.mocked(uploadEventImage).mockRejectedValue(new Error('Upload failed'))

    renderEventForm({ onSubmit: mockOnSubmit })

    // Fill in required fields
    const titleInput = screen.getByLabelText(/event title/i)
    await user.type(titleInput, 'Test Event')

    const categorySelect = screen.getByLabelText(/category/i)
    await user.selectOptions(categorySelect, 'Music')

    // Set times
    const startTimeInput = screen.getByLabelText(/start time/i)
    const endTimeInput = screen.getByLabelText(/end time/i)
    
    const startTime = new Date()
    startTime.setHours(startTime.getHours() + 1)
    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + 2)

    await user.type(startTimeInput, startTime.toISOString().slice(0, 16))
    await user.type(endTimeInput, endTime.toISOString().slice(0, 16))

    // Select location
    const selectLocationBtn = screen.getByTestId('select-location-btn')
    await user.click(selectLocationBtn)

    // Upload image that will fail
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['image'], 'image.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    // Submit the form
    const submitBtn = screen.getByText(/create event/i)
    await user.click(submitBtn)

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/failed to create event/i)).toBeInTheDocument()
    })

    // Verify onSubmit was not called due to upload failure
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should validate image file types and sizes', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = vi.fn()

    renderEventForm({ onSubmit: mockOnSubmit })

    // Try to upload invalid file type
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const invalidFile = new File(['text'], 'document.txt', { type: 'text/plain' })
    
    await user.upload(fileInput, invalidFile)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/file type.*not supported/i)).toBeInTheDocument()
    })

    // Try to upload oversized file (mock a large file)
    const largeFile = new File(['x'.repeat(15 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 }) // 15MB
    
    await user.upload(fileInput, largeFile)

    // Should show size validation error
    await waitFor(() => {
      expect(screen.getByText(/file size.*exceeds maximum/i)).toBeInTheDocument()
    })
  })

  it('should update existing event with new banner image', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = vi.fn()
    
    // Mock existing event with image
    const existingEvent = {
      id: 'event-123',
      title: 'Existing Event',
      category: 'Music',
      description: 'Original description',
      startTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      lat: 40.7128,
      lon: -74.0060,
      imagePath: 'https://example.com/old-banner.jpg'
    }

    const mockNewImageUrl = 'https://example.com/new-banner.jpg'
    vi.mocked(uploadEventImage).mockResolvedValue(mockNewImageUrl)

    renderEventForm({ 
      event: existingEvent,
      onSubmit: mockOnSubmit 
    })

    // Verify existing image is shown
    await waitFor(() => {
      const existingImage = screen.getByAltText(/preview/i)
      expect(existingImage).toHaveAttribute('src', existingEvent.imagePath)
    })

    // Upload new banner image
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const newBannerFile = new File(['new-banner'], 'new-banner.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, newBannerFile)

    // Wait for new image to be processed
    await waitFor(() => {
      expect(uploadEventImage).toHaveBeenCalledWith(expect.objectContaining({
        name: expect.stringContaining('new-banner')
      }))
    })

    // Submit the form
    const submitBtn = screen.getByText(/update event/i)
    await user.click(submitBtn)

    // Verify the updated event data includes the new image path
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        imagePath: mockNewImageUrl
      }))
    })
  })

  it('should remove banner image from existing event', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = vi.fn()
    
    // Mock existing event with image
    const existingEvent = {
      id: 'event-123',
      title: 'Existing Event',
      category: 'Music',
      description: 'Original description',
      startTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      lat: 40.7128,
      lon: -74.0060,
      imagePath: 'https://example.com/banner.jpg'
    }

    renderEventForm({ 
      event: existingEvent,
      onSubmit: mockOnSubmit 
    })

    // Verify existing image is shown
    await waitFor(() => {
      const existingImage = screen.getByAltText(/preview/i)
      expect(existingImage).toHaveAttribute('src', existingEvent.imagePath)
    })

    // Remove the image
    const removeBtn = screen.getByLabelText(/remove image/i)
    await user.click(removeBtn)

    // Submit the form
    const submitBtn = screen.getByText(/update event/i)
    await user.click(submitBtn)

    // Verify the updated event data has no image path
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        imagePath: undefined
      }))
    })

    // Verify no upload was attempted
    expect(uploadEventImage).not.toHaveBeenCalled()
  })
})