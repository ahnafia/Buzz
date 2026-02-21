import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import MakeFlagScreen from '../MakeFlagScreen'
import { api } from '../../utils/api'
import { uploadFlagImages } from '../../utils/storage'

// Mock the API and storage utilities
vi.mock('../../utils/api', () => ({
  api: {
    createFlag: vi.fn()
  }
}))

vi.mock('../../utils/storage', () => ({
  uploadFlagImages: vi.fn()
}))

// Mock the LocationPickerMap component
vi.mock('../../components/LocationPickerMap', () => ({
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

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

const renderMakeFlagScreen = () => {
  return render(
    <BrowserRouter>
      <MakeFlagScreen />
    </BrowserRouter>
  )
}

describe('MakeFlagScreen Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create a flag with multiple images successfully', async () => {
    const user = userEvent.setup()
    
    // Mock successful API responses
    const mockUploadedUrls = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ]
    const mockCreatedFlag = {
      id: 'flag-123',
      title: 'Test Flag',
      description: 'Test Description',
      lat: 40.7128,
      lon: -74.0060,
      imagePaths: mockUploadedUrls
    }

    vi.mocked(uploadFlagImages).mockResolvedValue(mockUploadedUrls)
    vi.mocked(api.createFlag).mockResolvedValue(mockCreatedFlag)

    renderMakeFlagScreen()

    // Fill in the flag name
    const nameInput = screen.getByPlaceholderText('Enter flag name')
    await user.type(nameInput, 'Test Flag')

    // Fill in location label
    const locationInput = screen.getByPlaceholderText('e.g. Central Park, NYC')
    await user.type(locationInput, 'New York City')

    // Fill in caption
    const captionInput = screen.getByPlaceholderText('Enter caption')
    await user.type(captionInput, 'Test Description')

    // Fill in tags
    const tagsInput = screen.getByPlaceholderText('Enter tags (e.g. food, fun)')
    await user.type(tagsInput, 'test, demo')

    // Select a location on the map
    const selectLocationBtn = screen.getByTestId('select-location-btn')
    await user.click(selectLocationBtn)

    // Add multiple images using the ImageUpload component
    const imageUpload = document.querySelector('input[type="file"]') as HTMLInputElement
    
    // Create mock files
    const file1 = new File(['image1'], 'image1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['image2'], 'image2.jpg', { type: 'image/jpeg' })
    
    // Upload the files
    await user.upload(imageUpload, [file1, file2])

    // Wait for images to be processed
    await waitFor(() => {
      expect(screen.getByText(/2\/10/)).toBeInTheDocument()
    })

    // Submit the form
    const generateBtn = screen.getByText('Generate')
    await user.click(generateBtn)

    // Wait for the API calls to complete
    await waitFor(() => {
      expect(uploadFlagImages).toHaveBeenCalledWith([
        expect.objectContaining({ name: expect.stringContaining('image') }),
        expect.objectContaining({ name: expect.stringContaining('image') })
      ])
    })

    await waitFor(() => {
      expect(api.createFlag).toHaveBeenCalledWith({
        title: 'Test Flag',
        description: 'Test Description',
        lat: 40.7128,
        lon: -74.0060,
        city: 'New York City',
        addressText: 'New York City',
        category: 'test, demo',
        imagePaths: mockUploadedUrls,
        color: expect.any(String),
        isPublic: true
      })
    })

    // Verify navigation to home page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('should create a flag without images successfully', async () => {
    const user = userEvent.setup()
    
    const mockCreatedFlag = {
      id: 'flag-123',
      title: 'Test Flag No Images',
      lat: 40.7128,
      lon: -74.0060,
      imagePaths: null
    }

    vi.mocked(api.createFlag).mockResolvedValue(mockCreatedFlag)

    renderMakeFlagScreen()

    // Fill in required fields only
    const nameInput = screen.getByPlaceholderText('Enter flag name')
    await user.type(nameInput, 'Test Flag No Images')

    // Select a location on the map
    const selectLocationBtn = screen.getByTestId('select-location-btn')
    await user.click(selectLocationBtn)

    // Submit the form without adding images
    const generateBtn = screen.getByText('Generate')
    await user.click(generateBtn)

    // Verify API call with no images
    await waitFor(() => {
      expect(api.createFlag).toHaveBeenCalledWith({
        title: 'Test Flag No Images',
        description: null,
        lat: 40.7128,
        lon: -74.0060,
        city: null,
        addressText: null,
        category: null,
        imagePaths: null,
        color: expect.any(String),
        isPublic: true
      })
    })

    // Verify uploadFlagImages was not called
    expect(uploadFlagImages).not.toHaveBeenCalled()

    // Verify navigation to home page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('should handle image upload errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock upload failure
    vi.mocked(uploadFlagImages).mockRejectedValue(new Error('Upload failed'))

    renderMakeFlagScreen()

    // Fill in required fields
    const nameInput = screen.getByPlaceholderText('Enter flag name')
    await user.type(nameInput, 'Test Flag')

    // Select a location
    const selectLocationBtn = screen.getByTestId('select-location-btn')
    await user.click(selectLocationBtn)

    // Add an image using file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['image'], 'image.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    // Submit the form
    const generateBtn = screen.getByText('Generate')
    await user.click(generateBtn)

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
    })

    // Verify API was not called due to upload failure
    expect(api.createFlag).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should handle flag creation API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock successful upload but failed flag creation
    vi.mocked(uploadFlagImages).mockResolvedValue(['https://example.com/image.jpg'])
    vi.mocked(api.createFlag).mockRejectedValue(new Error('Failed to create flag'))

    renderMakeFlagScreen()

    // Fill in required fields
    const nameInput = screen.getByPlaceholderText('Enter flag name')
    await user.type(nameInput, 'Test Flag')

    // Select a location
    const selectLocationBtn = screen.getByTestId('select-location-btn')
    await user.click(selectLocationBtn)

    // Add an image using file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['image'], 'image.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    // Submit the form
    const generateBtn = screen.getByText('Generate')
    await user.click(generateBtn)

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/failed to create flag/i)).toBeInTheDocument()
    })

    // Verify navigation did not occur
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should validate required fields before submission', async () => {
    const user = userEvent.setup()
    
    renderMakeFlagScreen()

    // Try to submit without filling required fields
    const generateBtn = screen.getByText('Generate')
    await user.click(generateBtn)

    // Should show error for missing flag name
    await waitFor(() => {
      expect(screen.getByText('Please enter a flag name.')).toBeInTheDocument()
    })

    // Fill in flag name but no location
    const nameInput = screen.getByPlaceholderText('Enter flag name')
    await user.type(nameInput, 'Test Flag')
    await user.click(generateBtn)

    // Should show error for missing location
    await waitFor(() => {
      expect(screen.getByText('Please choose a location on the map.')).toBeInTheDocument()
    })

    // Verify no API calls were made
    expect(uploadFlagImages).not.toHaveBeenCalled()
    expect(api.createFlag).not.toHaveBeenCalled()
  })
})