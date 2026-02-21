import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ImageCarousel } from '../ImageCarousel'

describe('ImageCarousel Component - Error Handling', () => {
  const mockImages = [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg'
  ]

  const mockOnImageChange = vi.fn()
  const mockOnImageError = vi.fn()
  const mockOnImageLoad = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  describe('Image Loading States', () => {
    it('should show loading state initially', () => {
      render(
        <ImageCarousel
          images={mockImages}
          onImageLoad={mockOnImageLoad}
          onImageError={mockOnImageError}
        />
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(document.querySelector('.image-carousel__loading-spinner')).toBeInTheDocument()
    })

    it('should handle successful image loading', async () => {
      render(
        <ImageCarousel
          images={mockImages}
          onImageLoad={mockOnImageLoad}
          onImageError={mockOnImageError}
        />
      )

      // Simulate image load success
      const images = screen.getAllByRole('img')
      fireEvent.load(images[0])

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalledWith(0)
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })

    it('should handle image loading errors', async () => {
      render(
        <ImageCarousel
          images={mockImages}
          onImageLoad={mockOnImageLoad}
          onImageError={mockOnImageError}
        />
      )

      // Simulate image load error
      const images = screen.getAllByRole('img')
      fireEvent.error(images[0])

      await waitFor(() => {
        expect(mockOnImageError).toHaveBeenCalledWith(0, expect.stringContaining('Failed to load image 1'))
        expect(screen.getByText('Failed to load image')).toBeInTheDocument()
      })
    })
  })

  describe('Retry Mechanism', () => {
    it('should automatically retry failed images', async () => {
      render(
        <ImageCarousel
          images={mockImages}
          enableRetry={true}
          onImageError={mockOnImageError}
        />
      )

      // Simulate image load error
      const images = screen.getAllByRole('img')
      fireEvent.error(images[0])

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument()
      })

      // Fast-forward to trigger retry
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByText(/retry 1/i)).toBeInTheDocument()
      })
    })

    it('should show retry button after max attempts', async () => {
      render(
        <ImageCarousel
          images={mockImages}
          enableRetry={true}
          onImageError={mockOnImageError}
        />
      )

      // Simulate multiple failures
      const images = screen.getAllByRole('img')
      
      // First failure
      fireEvent.error(images[0])
      
      // Fast-forward through all retry attempts
      for (let i = 0; i < 3; i++) {
        act(() => {
          vi.advanceTimersByTime(Math.pow(2, i) * 1000)
        })
        
        await waitFor(() => {})
        
        // Simulate failure again
        fireEvent.error(images[0])
      }

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('should allow manual retry', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      render(
        <ImageCarousel
          images={mockImages}
          enableRetry={true}
          onImageLoad={mockOnImageLoad}
        />
      )

      // Simulate image load error
      const images = screen.getAllByRole('img')
      fireEvent.error(images[0])

      // Wait for error state and retry button
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)

      // Should show loading state again
      expect(screen.getByText('Loading...')).toBeInTheDocument()

      // Simulate successful load after retry
      fireEvent.load(images[0])

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalledWith(0)
      })
    })

    it('should disable retry when enableRetry is false', async () => {
      render(
        <ImageCarousel
          images={mockImages}
          enableRetry={false}
          onImageError={mockOnImageError}
        />
      )

      // Simulate image load error
      const images = screen.getAllByRole('img')
      fireEvent.error(images[0])

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument()
      })

      // Should not show retry button
      expect(screen.queryByText('Retry')).not.toBeInTheDocument()

      // Fast-forward time - should not retry
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(screen.queryByText(/retry/i)).not.toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it('should show retry count in error message', async () => {
      render(
        <ImageCarousel
          images={mockImages}
          enableRetry={true}
          onImageError={mockOnImageError}
        />
      )

      // Simulate image load error
      const images = screen.getAllByRole('img')
      fireEvent.error(images[0])

      // Fast-forward to trigger retry
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Simulate error again
      fireEvent.error(images[0])

      await waitFor(() => {
        expect(screen.getByText(/1 attempts/i)).toBeInTheDocument()
      })
    })

    it('should show retry count in loading message', async () => {
      render(
        <ImageCarousel
          images={mockImages}
          enableRetry={true}
        />
      )

      // Simulate image load error to trigger retry
      const images = screen.getAllByRole('img')
      fireEvent.error(images[0])

      // Fast-forward to trigger retry
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByText(/retry 1\/3/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation with Errors', () => {
    it('should allow navigation even when some images fail to load', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      render(
        <ImageCarousel
          images={mockImages}
          onImageChange={mockOnImageChange}
        />
      )

      // Simulate first image error
      const images = screen.getAllByRole('img')
      fireEvent.error(images[0])

      // Should still be able to navigate
      const nextButton = screen.getByLabelText('Next image')
      await user.click(nextButton)

      expect(mockOnImageChange).toHaveBeenCalledWith(1)
    })

    it('should show counter correctly with failed images', async () => {
      render(
        <ImageCarousel
          images={mockImages}
        />
      )

      // Should show counter regardless of image load state
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no images provided', () => {
      render(<ImageCarousel images={[]} />)

      expect(screen.getByText('No images to display')).toBeInTheDocument()
      expect(document.querySelector('.image-carousel--empty')).toBeInTheDocument()
    })

    it('should handle undefined images gracefully', () => {
      render(<ImageCarousel images={undefined as any} />)

      expect(screen.getByText('No images to display')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for retry buttons', async () => {
      render(
        <ImageCarousel
          images={mockImages}
          enableRetry={true}
        />
      )

      // Simulate image load error
      const images = screen.getAllByRole('img')
      fireEvent.error(images[0])

      await waitFor(() => {
        const retryButton = screen.getByLabelText('Retry loading image 1')
        expect(retryButton).toBeInTheDocument()
      })
    })

    it('should maintain keyboard navigation with errors', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      render(
        <ImageCarousel
          images={mockImages}
          onImageChange={mockOnImageChange}
        />
      )

      const carousel = screen.getByRole('region')
      carousel.focus()

      // Should handle keyboard navigation even with image errors
      await user.keyboard('{ArrowRight}')
      expect(mockOnImageChange).toHaveBeenCalledWith(1)

      await user.keyboard('{ArrowLeft}')
      expect(mockOnImageChange).toHaveBeenCalledWith(0)
    })
  })

  describe('Performance', () => {
    it('should cleanup retry timeouts on unmount', () => {
      const { unmount } = render(
        <ImageCarousel
          images={mockImages}
          enableRetry={true}
        />
      )

      // Simulate image load error to start retry timer
      const images = screen.getAllByRole('img')
      fireEvent.error(images[0])

      // Unmount component
      unmount()

      // Fast-forward time - should not cause any issues
      act(() => {
        vi.advanceTimersByTime(10000)
      })

      // No assertions needed - test passes if no errors thrown
    })

    it('should handle rapid error/success cycles', async () => {
      render(
        <ImageCarousel
          images={mockImages}
          enableRetry={true}
          onImageLoad={mockOnImageLoad}
          onImageError={mockOnImageError}
        />
      )

      const images = screen.getAllByRole('img')

      // Rapid error/success cycle
      fireEvent.error(images[0])
      fireEvent.load(images[0])
      fireEvent.error(images[0])
      fireEvent.load(images[0])

      await waitFor(() => {
        expect(mockOnImageLoad).toHaveBeenCalledTimes(2)
        expect(mockOnImageError).toHaveBeenCalledTimes(2)
      })
    })
  })
})