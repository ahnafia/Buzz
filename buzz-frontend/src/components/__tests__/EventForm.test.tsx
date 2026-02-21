import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { forwardRef } from 'react'
import EventForm from '../EventForm'
import type { Event } from '../../types/api'
import * as storage from '../../utils/storage'

// Mock the storage module
vi.mock('../../utils/storage', () => ({
  uploadEventImage: vi.fn()
}))

// Mock fetch for blob URL handling
global.fetch = vi.fn()

// Mock the LocationPickerMap component
vi.mock('../LocationPickerMap', () => ({
  default: forwardRef<any, any>((props, ref) => {
    return (
      <div data-testid="location-picker-map" onClick={() => props.onLocationSelect({ lat: 40.7128, lng: -74.0060 })}>
        Mock Map
      </div>
    )
  })
}))

// Mock the ImageUpload component
vi.mock('../ImageUpload', () => ({
  default: ({ onImagesChange, initialImages, disabled }: any) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const urls = files.map(() => 'blob:mock-image-url')
      onImagesChange(urls)
    }

    return (
      <div data-testid="image-upload">
        <input
          data-testid="image-upload-input"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled}
        />
        {initialImages?.length > 0 && (
          <div data-testid="image-preview">
            {initialImages.map((url: string, index: number) => (
              <img key={index} src={url} alt={`Preview ${index}`} />
            ))}
          </div>
        )}
      </div>
    )
  }
}))

describe('EventForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()
  const mockUploadEventImage = vi.mocked(storage.uploadEventImage)
  const mockFetch = vi.mocked(fetch)

  beforeEach(() => {
    vi.clearAllMocks()
    mockUploadEventImage.mockResolvedValue('https://example.com/uploaded-image.jpg')
    mockFetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' }))
    } as Response)
  })

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    location: { lat: 40.7128, lon: -74.0060 }
  }

  it('renders form fields including image upload', () => {
    render(<EventForm {...defaultProps} />)

    expect(screen.getByLabelText(/event title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument()
    expect(screen.getByText(/banner image/i)).toBeInTheDocument()
    expect(screen.getByTestId('image-upload')).toBeInTheDocument()
  })

  it('submits form with banner image', async () => {
    const user = userEvent.setup()
    render(<EventForm {...defaultProps} />)

    // Fill out required fields
    await user.type(screen.getByLabelText(/event title/i), 'Test Event')
    await user.selectOptions(screen.getByLabelText(/category/i), 'Music')
    
    // Set both start and end times to avoid validation errors
    const startTimeInput = screen.getByLabelText(/start time/i)
    const endTimeInput = screen.getByLabelText(/end time/i)
    await user.clear(startTimeInput)
    await user.type(startTimeInput, '2024-12-25T10:00')
    await user.clear(endTimeInput)
    await user.type(endTimeInput, '2024-12-25T18:00')

    // Upload an image
    const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' })
    const imageInput = screen.getByTestId('image-upload-input')
    await user.upload(imageInput, file)

    // Submit form
    await user.click(screen.getByRole('button', { name: /create event/i }))

    await waitFor(() => {
      expect(mockUploadEventImage).toHaveBeenCalledWith(expect.any(File))
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Event',
        category: 'Music',
        imagePath: 'https://example.com/uploaded-image.jpg'
      }))
    }, { timeout: 3000 })
  })

  it('submits form without banner image', async () => {
    const user = userEvent.setup()
    render(<EventForm {...defaultProps} />)

    // Fill out required fields
    await user.type(screen.getByLabelText(/event title/i), 'Test Event')
    await user.selectOptions(screen.getByLabelText(/category/i), 'Music')
    
    // Set both start and end times to avoid validation errors
    const startTimeInput = screen.getByLabelText(/start time/i)
    const endTimeInput = screen.getByLabelText(/end time/i)
    await user.clear(startTimeInput)
    await user.type(startTimeInput, '2024-12-25T10:00')
    await user.clear(endTimeInput)
    await user.type(endTimeInput, '2024-12-25T18:00')

    // Submit form without uploading image
    await user.click(screen.getByRole('button', { name: /create event/i }))

    await waitFor(() => {
      expect(mockUploadEventImage).not.toHaveBeenCalled()
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Event',
        category: 'Music',
        imagePath: undefined
      }))
    }, { timeout: 3000 })
  })

  it('displays existing image when editing event', () => {
    const existingEvent: Event = {
      id: '1',
      title: 'Existing Event',
      category: 'Music',
      startTime: '2024-12-25T10:00:00.000Z',
      expiresAt: '2024-12-25T18:00:00.000Z',
      owner: 'user1',
      lat: 40.7128,
      lon: -74.0060,
      description: 'Test description',
      imagePath: 'https://example.com/existing-image.jpg'
    }

    render(<EventForm {...defaultProps} event={existingEvent} />)

    expect(screen.getByTestId('image-preview')).toBeInTheDocument()
    expect(screen.getByAltText('Preview 0')).toHaveAttribute('src', 'https://example.com/existing-image.jpg')
  })

  it('handles image upload error gracefully', async () => {
    const user = userEvent.setup()
    mockUploadEventImage.mockRejectedValue(new Error('Upload failed'))
    
    render(<EventForm {...defaultProps} />)

    // Fill out required fields
    await user.type(screen.getByLabelText(/event title/i), 'Test Event')
    await user.selectOptions(screen.getByLabelText(/category/i), 'Music')
    
    // Set both start and end times
    const startTimeInput = screen.getByLabelText(/start time/i)
    const endTimeInput = screen.getByLabelText(/end time/i)
    await user.clear(startTimeInput)
    await user.type(startTimeInput, '2024-12-25T10:00')
    await user.clear(endTimeInput)
    await user.type(endTimeInput, '2024-12-25T18:00')

    // Upload an image
    const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' })
    const imageInput = screen.getByTestId('image-upload-input')
    await user.upload(imageInput, file)

    // Submit form
    await user.click(screen.getByRole('button', { name: /create event/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to create event/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('disables form during image upload', async () => {
    const user = userEvent.setup()
    // Make upload take some time
    let resolveUpload: (value: string) => void
    const uploadPromise = new Promise<string>((resolve) => {
      resolveUpload = resolve
    })
    mockUploadEventImage.mockReturnValue(uploadPromise)
    
    render(<EventForm {...defaultProps} />)

    // Fill out required fields
    await user.type(screen.getByLabelText(/event title/i), 'Test Event')
    await user.selectOptions(screen.getByLabelText(/category/i), 'Music')
    
    // Set both start and end times
    const startTimeInput = screen.getByLabelText(/start time/i)
    const endTimeInput = screen.getByLabelText(/end time/i)
    await user.clear(startTimeInput)
    await user.type(startTimeInput, '2024-12-25T10:00')
    await user.clear(endTimeInput)
    await user.type(endTimeInput, '2024-12-25T18:00')

    // Upload an image
    const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' })
    const imageInput = screen.getByTestId('image-upload-input')
    await user.upload(imageInput, file)

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create event/i })
    await user.click(submitButton)

    // Check that button shows loading state and input is disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
      expect(screen.getByTestId('image-upload-input')).toBeDisabled()
    })

    // Resolve the upload
    resolveUpload!('https://example.com/uploaded-image.jpg')

    // Wait for upload to complete
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })
  })

  it('validates required fields before submission', async () => {
    const user = userEvent.setup()
    render(<EventForm {...defaultProps} />)

    // Try to submit without filling required fields
    await user.click(screen.getByRole('button', { name: /create event/i }))

    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    expect(screen.getByText(/category is required/i)).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('updates existing event with new image', async () => {
    const user = userEvent.setup()
    const existingEvent: Event = {
      id: '1',
      title: 'Existing Event',
      category: 'Music',
      startTime: '2024-12-25T10:00:00.000Z',
      expiresAt: '2024-12-25T18:00:00.000Z',
      owner: 'user1',
      lat: 40.7128,
      lon: -74.0060,
      description: 'Test description',
      imagePath: 'https://example.com/existing-image.jpg'
    }

    render(<EventForm {...defaultProps} event={existingEvent} />)

    // Upload a new image
    const file = new File(['test'], 'new-image.jpg', { type: 'image/jpeg' })
    const imageInput = screen.getByTestId('image-upload-input')
    await user.upload(imageInput, file)

    // Submit form
    await user.click(screen.getByRole('button', { name: /update event/i }))

    await waitFor(() => {
      expect(mockUploadEventImage).toHaveBeenCalledWith(expect.any(File))
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        imagePath: 'https://example.com/uploaded-image.jpg'
      }))
    }, { timeout: 3000 })
  })
})