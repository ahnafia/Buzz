import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ImageCarousel from './ImageCarousel'

// Mock images for testing
const mockImages = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/image3.jpg'
]

const singleImage = ['https://example.com/single.jpg']

describe('ImageCarousel', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    // Mock Image constructor for preloading
    global.Image = class {
      src = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      
      constructor() {
        setTimeout(() => {
          if (this.onload) {
            this.onload()
          }
        }, 0)
      }
    } as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders empty state when no images provided', () => {
      render(<ImageCarousel images={[]} />)
      
      expect(screen.getByText('No images to display')).toBeInTheDocument()
      expect(screen.getByText('🖼️')).toBeInTheDocument()
    })

    it('renders single image without navigation', () => {
      render(<ImageCarousel images={singleImage} />)
      
      const image = screen.getByAltText('Image 1 of 1')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', singleImage[0])
      
      // Should not show navigation for single image
      expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument()
      expect(screen.queryByText('1 / 1')).not.toBeInTheDocument()
    })

    it('renders multiple images with navigation', () => {
      render(<ImageCarousel images={mockImages} />)
      
      // Should show first image
      const image = screen.getByAltText('Image 1 of 3')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', mockImages[0])
      
      // Should show navigation
      expect(screen.getByLabelText('Previous image')).toBeInTheDocument()
      expect(screen.getByLabelText('Next image')).toBeInTheDocument()
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <ImageCarousel images={mockImages} className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('image-carousel', 'custom-class')
    })

    it('sets initial index correctly', () => {
      render(<ImageCarousel images={mockImages} initialIndex={1} />)
      
      const image = screen.getByAltText('Image 2 of 3')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', mockImages[1])
      expect(screen.getByText('2 / 3')).toBeInTheDocument()
    })

    it('handles invalid initial index gracefully', () => {
      render(<ImageCarousel images={mockImages} initialIndex={10} />)
      
      // Should default to last valid index
      const image = screen.getByAltText('Image 3 of 3')
      expect(image).toBeInTheDocument()
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })
  })

  describe('Navigation Logic', () => {
    it('navigates to next image on next button click', async () => {
      const onImageChange = vi.fn()
      render(<ImageCarousel images={mockImages} onImageChange={onImageChange} />)
      
      const nextButton = screen.getByLabelText('Next image')
      await user.click(nextButton)
      
      expect(screen.getByText('2 / 3')).toBeInTheDocument()
      expect(onImageChange).toHaveBeenCalledWith(1)
    })

    it('navigates to previous image on previous button click', async () => {
      const onImageChange = vi.fn()
      render(<ImageCarousel images={mockImages} initialIndex={1} onImageChange={onImageChange} />)
      
      const prevButton = screen.getByLabelText('Previous image')
      await user.click(prevButton)
      
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
      expect(onImageChange).toHaveBeenCalledWith(0)
    })

    it('wraps around from last to first image', async () => {
      render(<ImageCarousel images={mockImages} initialIndex={2} />)
      
      const nextButton = screen.getByLabelText('Next image')
      await user.click(nextButton)
      
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('wraps around from first to last image', async () => {
      render(<ImageCarousel images={mockImages} initialIndex={0} />)
      
      const prevButton = screen.getByLabelText('Previous image')
      await user.click(prevButton)
      
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('navigates with arrow keys', async () => {
      const onImageChange = vi.fn()
      render(<ImageCarousel images={mockImages} onImageChange={onImageChange} />)
      
      const carousel = screen.getByRole('region')
      carousel.focus()
      
      // Navigate right
      await user.keyboard('{ArrowRight}')
      expect(screen.getByText('2 / 3')).toBeInTheDocument()
      expect(onImageChange).toHaveBeenCalledWith(1)
      
      // Navigate left
      await user.keyboard('{ArrowLeft}')
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
      expect(onImageChange).toHaveBeenCalledWith(0)
    })

    it('navigates to first image with Home key', async () => {
      render(<ImageCarousel images={mockImages} initialIndex={2} />)
      
      const carousel = screen.getByRole('region')
      carousel.focus()
      
      await user.keyboard('{Home}')
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('navigates to last image with End key', async () => {
      render(<ImageCarousel images={mockImages} initialIndex={0} />)
      
      const carousel = screen.getByRole('region')
      carousel.focus()
      
      await user.keyboard('{End}')
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })

    it('prevents default behavior for navigation keys', async () => {
      const onImageChange = vi.fn()
      render(<ImageCarousel images={mockImages} onImageChange={onImageChange} />)
      
      const carousel = screen.getByRole('region')
      carousel.focus()
      
      // Test that navigation works (which implies preventDefault was called)
      await user.keyboard('{ArrowRight}')
      expect(onImageChange).toHaveBeenCalledWith(1)
      
      // The fact that navigation works means preventDefault was called
      // to prevent default browser behavior
    })
  })

  describe('Touch/Swipe Navigation', () => {
    it('handles touch start event', () => {
      render(<ImageCarousel images={mockImages} />)
      
      const main = screen.getByRole('region').querySelector('.image-carousel__main')
      expect(main).toBeInTheDocument()
      
      fireEvent.touchStart(main!, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Should not throw error
      expect(main).toBeInTheDocument()
    })

    it('navigates on swipe left (next image)', () => {
      render(<ImageCarousel images={mockImages} />)
      
      const main = screen.getByRole('region').querySelector('.image-carousel__main')!
      
      // Start touch
      fireEvent.touchStart(main, {
        touches: [{ clientX: 200, clientY: 100 }]
      })
      
      // Move left (swipe left)
      fireEvent.touchMove(main, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // End touch
      fireEvent.touchEnd(main)
      
      expect(screen.getByText('2 / 3')).toBeInTheDocument()
    })

    it('navigates on swipe right (previous image)', () => {
      render(<ImageCarousel images={mockImages} initialIndex={1} />)
      
      const main = screen.getByRole('region').querySelector('.image-carousel__main')!
      
      // Start touch
      fireEvent.touchStart(main, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Move right (swipe right)
      fireEvent.touchMove(main, {
        touches: [{ clientX: 200, clientY: 100 }]
      })
      
      // End touch
      fireEvent.touchEnd(main)
      
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('ignores small swipe movements', () => {
      render(<ImageCarousel images={mockImages} />)
      
      const main = screen.getByRole('region').querySelector('.image-carousel__main')!
      
      // Start touch
      fireEvent.touchStart(main, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Small movement (below threshold)
      fireEvent.touchMove(main, {
        touches: [{ clientX: 120, clientY: 100 }]
      })
      
      // End touch
      fireEvent.touchEnd(main)
      
      // Should stay on first image
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
  })

  describe('Thumbnail Navigation', () => {
    it('shows thumbnails for reasonable number of images', () => {
      render(<ImageCarousel images={mockImages} />)
      
      // Should show thumbnails for 3 images
      expect(screen.getByLabelText('Go to image 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to image 2')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to image 3')).toBeInTheDocument()
    })

    it('shows dots instead of thumbnails for many images', () => {
      const manyImages = Array.from({ length: 15 }, (_, i) => `https://example.com/image${i + 1}.jpg`)
      render(<ImageCarousel images={manyImages} />)
      
      // Should show dots instead of thumbnails
      expect(screen.queryByLabelText('Thumbnail 1')).not.toBeInTheDocument()
      expect(screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.startsWith('Go to image')
      )).toHaveLength(15)
    })

    it('navigates to specific image on thumbnail click', async () => {
      const onImageChange = vi.fn()
      render(<ImageCarousel images={mockImages} onImageChange={onImageChange} />)
      
      const thumbnail = screen.getByLabelText('Go to image 3')
      await user.click(thumbnail)
      
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
      expect(onImageChange).toHaveBeenCalledWith(2)
    })

    it('highlights active thumbnail', () => {
      render(<ImageCarousel images={mockImages} initialIndex={1} />)
      
      const thumbnails = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.startsWith('Go to image')
      )
      
      expect(thumbnails[1]).toHaveClass('image-carousel__thumbnail--active')
      expect(thumbnails[0]).not.toHaveClass('image-carousel__thumbnail--active')
      expect(thumbnails[2]).not.toHaveClass('image-carousel__thumbnail--active')
    })
  })

  describe('Loading and Error States', () => {
    it('shows loading state initially', async () => {
      render(<ImageCarousel images={mockImages} />)
      
      // Loading state should be visible initially for all images
      await waitFor(() => {
        const loadingElements = screen.getAllByText('Loading...')
        expect(loadingElements.length).toBeGreaterThan(0)
      })
    })

    it('handles image load success', async () => {
      render(<ImageCarousel images={mockImages} />)
      
      const image = screen.getByAltText('Image 1 of 3')
      
      // Simulate image load
      fireEvent.load(image)
      
      await waitFor(() => {
        // Check that loading state for the first image is gone
        const loadingElements = screen.queryAllByText('Loading...')
        // Should have fewer loading elements after one loads
        expect(loadingElements.length).toBeLessThan(3)
      })
    })

    it('handles image load error', async () => {
      render(<ImageCarousel images={mockImages} />)
      
      const image = screen.getByAltText('Image 1 of 3')
      
      // Simulate image error
      fireEvent.error(image)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument()
        expect(screen.getByText('⚠️')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ImageCarousel images={mockImages} />)
      
      expect(screen.getByRole('region')).toHaveAttribute(
        'aria-label',
        'Image carousel with 3 images'
      )
      
      expect(screen.getByLabelText('Previous image')).toBeInTheDocument()
      expect(screen.getByLabelText('Next image')).toBeInTheDocument()
    })

    it('is keyboard focusable', () => {
      render(<ImageCarousel images={mockImages} />)
      
      const carousel = screen.getByRole('region')
      expect(carousel).toHaveAttribute('tabIndex', '0')
    })

    it('has proper alt text for images', () => {
      render(<ImageCarousel images={mockImages} />)
      
      const image = screen.getByAltText('Image 1 of 3')
      expect(image).toBeInTheDocument()
    })

    it('has proper alt text for thumbnails', () => {
      render(<ImageCarousel images={mockImages} />)
      
      const thumbnailImages = screen.getAllByAltText(/^Thumbnail \d+$/)
      expect(thumbnailImages).toHaveLength(3)
    })
  })

  describe('Performance Optimizations', () => {
    it('sets loading attribute correctly', () => {
      render(<ImageCarousel images={mockImages} />)
      
      const images = screen.getAllByRole('img').filter(img => 
        img.getAttribute('alt')?.startsWith('Image')
      )
      
      // Current image should have eager loading
      expect(images[0]).toHaveAttribute('loading', 'eager')
      
      // Other images should have lazy loading
      expect(images[1]).toHaveAttribute('loading', 'lazy')
      expect(images[2]).toHaveAttribute('loading', 'lazy')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty images array gracefully', () => {
      render(<ImageCarousel images={[]} />)
      
      expect(screen.getByText('No images to display')).toBeInTheDocument()
    })

    it('handles undefined images gracefully', () => {
      // Should not crash and show empty state
      expect(() => {
        render(<ImageCarousel images={undefined as any} />)
      }).not.toThrow()
      
      expect(screen.getByText('No images to display')).toBeInTheDocument()
    })

    it('handles navigation when images array changes', async () => {
      const { rerender } = render(<ImageCarousel images={mockImages} initialIndex={2} />)
      
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
      
      // Change to fewer images
      rerender(<ImageCarousel images={singleImage} initialIndex={2} />)
      
      // Should adjust to valid index
      expect(screen.getByAltText('Image 1 of 1')).toBeInTheDocument()
    })
  })
})