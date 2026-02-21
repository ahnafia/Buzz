import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ImageUpload } from '../ImageUpload'
import * as storage from '../../utils/storage'

// Mock the storage utilities
vi.mock('../../utils/storage', () => ({
  uploadEventImage: vi.fn(),
  uploadFlagImages: vi.fn()
}))

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock Image constructor for dimension validation
global.Image = class {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  width = 1024
  height = 768

  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload()
      }
    }, 0)
  }
} as any

describe('ImageUpload Component - Error Handling', () => {
  const mockOnImagesChange = vi.fn()
  const mockOnUploadStart = vi.fn()
  const mockOnUploadComplete = vi.fn()
  const mockOnUploadError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(storage.uploadEventImage as any).mockResolvedValue('https://example.com/image.jpg')
    ;(storage.uploadFlagImages as any).mockResolvedValue(['https://example.com/image1.jpg'])
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('File Validation', () => {
    it('should reject files that are too large', async () => {
      const user = userEvent.setup()
      
      render(
        <ImageUpload
          mode="single"
          maxSizeBytes={1024} // 1KB limit
          onImagesChange={mockOnImagesChange}
        />
      )

      const file = new File(['x'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload an image/i)

      await user.upload(input, file)

      expect(screen.getByText(/file size.*exceeds maximum/i)).toBeInTheDocument()
    })

    it('should reject unsupported file types', async () => {
      const user = userEvent.setup()
      
      render(
        <ImageUpload
          mode="single"
          acceptTypes="image/jpeg,image/png"
          onImagesChange={mockOnImagesChange}
        />
      )

      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText(/upload an image/i)

      await user.upload(input, file)

      expect(screen.getByText(/file type.*not supported/i)).toBeInTheDocument()
    })

    it('should reject too many files in multiple mode', async () => {
      const user = userEvent.setup()
      
      render(
        <ImageUpload
          mode="multiple"
          maxFiles={2}
          onImagesChange={mockOnImagesChange}
        />
      )

      const files = [
        new File(['content1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'image2.jpg', { type: 'image/jpeg' }),
        new File(['content3'], 'image3.jpg', { type: 'image/jpeg' })
      ]
      const input = screen.getByLabelText(/upload images/i)

      await user.upload(input, files)

      expect(screen.getByText(/cannot upload.*maximum allowed/i)).toBeInTheDocument()
    })

    it('should validate image dimensions', async () => {
      const user = userEvent.setup()
      
      // Mock Image to return large dimensions
      global.Image = class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        src = ''
        width = 5000 // Exceeds MAX_IMAGE_DIMENSION (4096)
        height = 5000

        constructor() {
          setTimeout(() => {
            if (this.onload) {
              this.onload()
            }
          }, 0)
        }
      } as any

      render(
        <ImageUpload
          mode="single"
          onImagesChange={mockOnImagesChange}
        />
      )

      const file = new File(['content'], 'large-image.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload an image/i)

      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText(/image dimensions.*exceed maximum/i)).toBeInTheDocument()
      })
    })
  })

  describe('Upload Error Handling', () => {
    it('should handle network errors with retry', async () => {
      const user = userEvent.setup()
      vi.useFakeTimers()
      
      ;(storage.uploadEventImage as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('https://example.com/image.jpg')

      render(
        <ImageUpload
          mode="single"
          onImagesChange={mockOnImagesChange}
          onUploadError={mockOnUploadError}
        />
      )

      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload an image/i)

      await user.upload(input, file)

      // Should show retry message
      await waitFor(() => {
        expect(screen.getByText(/upload failed.*retrying/i)).toBeInTheDocument()
      })

      // Fast-forward time to trigger retry
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should eventually succeed
      await waitFor(() => {
        expect(mockOnImagesChange).toHaveBeenCalledWith(['https://example.com/image.jpg'])
      })

      vi.useRealTimers()
    })

    it('should show retry button after max attempts', async () => {
      const user = userEvent.setup()
      vi.useFakeTimers()
      
      ;(storage.uploadEventImage as any).mockRejectedValue(new Error('Network error'))

      render(
        <ImageUpload
          mode="single"
          onImagesChange={mockOnImagesChange}
          onUploadError={mockOnUploadError}
        />
      )

      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload an image/i)

      await user.upload(input, file)

      // Fast-forward through all retry attempts
      for (let i = 0; i < 3; i++) {
        act(() => {
          vi.advanceTimersByTime(Math.pow(2, i) * 1000)
        })
        await waitFor(() => {})
      }

      // Should show retry button
      await waitFor(() => {
        expect(screen.getByText('Retry Upload')).toBeInTheDocument()
      })

      vi.useRealTimers()
    })

    it('should allow manual retry', async () => {
      const user = userEvent.setup()
      
      ;(storage.uploadEventImage as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('https://example.com/image.jpg')

      render(
        <ImageUpload
          mode="single"
          onImagesChange={mockOnImagesChange}
        />
      )

      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload an image/i)

      await user.upload(input, file)

      // Wait for all retries to fail
      await waitFor(() => {
        expect(screen.getByText('Retry Upload')).toBeInTheDocument()
      }, { timeout: 10000 })

      // Click retry button
      const retryButton = screen.getByText('Retry Upload')
      await user.click(retryButton)

      // Should eventually succeed
      await waitFor(() => {
        expect(mockOnImagesChange).toHaveBeenCalledWith(['https://example.com/image.jpg'])
      })
    })

    it('should allow canceling upload', async () => {
      const user = userEvent.setup()
      
      // Mock a slow upload
      ;(storage.uploadEventImage as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('url'), 5000))
      )

      render(
        <ImageUpload
          mode="single"
          onImagesChange={mockOnImagesChange}
        />
      )

      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload an image/i)

      await user.upload(input, file)

      // Should show progress and cancel button
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })

      // Click cancel
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // Should show cancelled message
      expect(screen.getByText(/upload cancelled/i)).toBeInTheDocument()
    })
  })

  describe('UI States', () => {
    it('should show different error types with appropriate styling', async () => {
      const user = userEvent.setup()
      
      render(
        <ImageUpload
          mode="multiple"
          maxFiles={1}
          maxSizeBytes={1024}
          acceptTypes="image/jpeg"
          onImagesChange={mockOnImagesChange}
        />
      )

      // Test file size error
      const largeFile = new File(['x'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload images/i)
      
      await user.upload(input, largeFile)
      
      expect(screen.getByText(/file size.*exceeds/i)).toBeInTheDocument()
      expect(document.querySelector('.image-upload__validation-error--file_size')).toBeInTheDocument()

      // Clear and test file type error
      const clearButton = screen.getByText('Clear all')
      await user.click(clearButton)

      const wrongTypeFile = new File(['content'], 'image.png', { type: 'image/png' })
      await user.upload(input, wrongTypeFile)
      
      expect(screen.getByText(/file type.*not supported/i)).toBeInTheDocument()
      expect(document.querySelector('.image-upload__validation-error--file_type')).toBeInTheDocument()
    })

    it('should show upload status indicators', async () => {
      const user = userEvent.setup()
      
      render(
        <ImageUpload
          mode="multiple"
          onImagesChange={mockOnImagesChange}
        />
      )

      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload images/i)

      await user.upload(input, file)

      // Should show success indicator after upload
      await waitFor(() => {
        expect(document.querySelector('.image-upload__status--success')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <ImageUpload
          mode="single"
          onImagesChange={mockOnImagesChange}
        />
      )

      expect(screen.getByRole('button')).toHaveAttribute('aria-label')
      expect(screen.getByLabelText(/upload an image/i)).toBeInTheDocument()
    })

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup()
      
      render(
        <ImageUpload
          mode="single"
          maxSizeBytes={1024}
          onImagesChange={mockOnImagesChange}
        />
      )

      const file = new File(['x'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload an image/i)

      await user.upload(input, file)

      const errorElement = screen.getByRole('alert')
      expect(errorElement).toBeInTheDocument()
      expect(errorElement).toHaveTextContent(/file size.*exceeds/i)
    })
  })
})