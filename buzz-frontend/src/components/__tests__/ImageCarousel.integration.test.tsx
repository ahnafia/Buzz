import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ImageCarousel from '../ImageCarousel'

describe('ImageCarousel Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should display multiple images with navigation controls', async () => {
    const mockImages = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ]
    const mockOnImageChange = vi.fn()

    render(
      <ImageCarousel 
        images={mockImages}
        onImageChange={mockOnImageChange}
      />
    )

    // Verify first image is displayed
    const firstImage = screen.getByAltText('Image 1 of 3')
    expect(firstImage).toBeInTheDocument()
    expect(firstImage).toHaveAttribute('src', 'https://example.com/image1.jpg')

    // Verify navigation controls are present
    expect(screen.getByLabelText('Previous image')).toBeInTheDocument()
    expect(screen.getByLabelText('Next image')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    // Verify thumbnails are present
    const thumbnails = screen.getAllByLabelText(/go to image/i)
    expect(thumbnails).toHaveLength(3)

    // Verify initial callback
    expect(mockOnImageChange).toHaveBeenCalledWith(0)
  })

  it('should navigate to next image using next button', async () => {
    const user = userEvent.setup()
    const mockImages = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ]
    const mockOnImageChange = vi.fn()

    render(
      <ImageCarousel 
        images={mockImages}
        onImageChange={mockOnImageChange}
      />
    )

    // Click next button
    const nextBtn = screen.getByLabelText('Next image')
    await user.click(nextBtn)

    // Verify second image is now displayed
    await waitFor(() => {
      const secondImage = screen.getByAltText('Image 2 of 2')
      expect(secondImage).toBeInTheDocument()
      expect(secondImage).toHaveAttribute('src', 'https://example.com/image2.jpg')
    })

    // Verify counter updated
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    // Verify callback was called
    expect(mockOnImageChange).toHaveBeenCalledWith(1)
  })

  it('should navigate to previous image using previous button', async () => {
    const user = userEvent.setup()
    const mockImages = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ]

    render(
      <ImageCarousel 
        images={mockImages}
        initialIndex={1} // Start at second image
      />
    )

    // Verify starting at second image
    const secondImage = screen.getByAltText('Image 2 of 2')
    expect(secondImage).toBeInTheDocument()

    // Click previous button
    const prevBtn = screen.getByLabelText('Previous image')
    await user.click(prevBtn)

    // Verify first image is now displayed
    await waitFor(() => {
      const firstImage = screen.getByAltText('Image 1 of 2')
      expect(firstImage).toBeInTheDocument()
      expect(firstImage).toHaveAttribute('src', 'https://example.com/image1.jpg')
    })

    // Verify counter updated
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('should wrap around when navigating past boundaries', async () => {
    const user = userEvent.setup()
    const mockImages = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ]

    render(
      <ImageCarousel images={mockImages} />
    )

    // Start at first image, click previous (should wrap to last)
    const prevBtn = screen.getByLabelText('Previous image')
    await user.click(prevBtn)

    // Should show second image (wrapped around)
    await waitFor(() => {
      expect(screen.getByText('2 / 2')).toBeInTheDocument()
    })

    // Now click next twice to wrap forward
    const nextBtn = screen.getByLabelText('Next image')
    await user.click(nextBtn) // Back to first
    await user.click(nextBtn) // Should wrap to first again

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('should navigate using thumbnail clicks', async () => {
    const user = userEvent.setup()
    const mockImages = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ]

    render(
      <ImageCarousel images={mockImages} />
    )

    // Click on third thumbnail
    const thirdThumbnail = screen.getByLabelText('Go to image 3')
    await user.click(thirdThumbnail)

    // Verify third image is displayed
    await waitFor(() => {
      const thirdImage = screen.getByAltText('Image 3 of 3')
      expect(thirdImage).toBeInTheDocument()
      expect(thirdImage).toHaveAttribute('src', 'https://example.com/image3.jpg')
    })

    // Verify counter updated
    expect(screen.getByText('3 / 3')).toBeInTheDocument()

    // Verify thumbnail is marked as active
    expect(thirdThumbnail).toHaveClass('image-carousel__thumbnail--active')
  })

  it('should navigate using keyboard controls', async () => {
    const user = userEvent.setup()
    const mockImages = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ]

    render(
      <ImageCarousel images={mockImages} />
    )

    const carousel = screen.getByRole('region')
    
    // Focus the carousel
    carousel.focus()

    // Press right arrow to go to next image
    await user.keyboard('{ArrowRight}')

    await waitFor(() => {
      expect(screen.getByText('2 / 3')).toBeInTheDocument()
    })

    // Press left arrow to go back
    await user.keyboard('{ArrowLeft}')

    await waitFor(() => {
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    // Press End to go to last image
    await user.keyboard('{End}')

    await waitFor(() => {
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })

    // Press Home to go to first image
    await user.keyboard('{Home}')

    await waitFor(() => {
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
  })

  it('should handle touch/swipe navigation', async () => {
    const mockImages = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ]

    render(
      <ImageCarousel images={mockImages} />
    )

    const carouselMain = document.querySelector('.image-carousel__main')
    expect(carouselMain).toBeInTheDocument()

    // Simulate swipe left (next image)
    fireEvent.touchStart(carouselMain!, {
      touches: [{ clientX: 200, clientY: 100 }]
    })

    fireEvent.touchMove(carouselMain!, {
      touches: [{ clientX: 100, clientY: 100 }]
    })

    fireEvent.touchEnd(carouselMain!)

    // Should navigate to next image
    await waitFor(() => {
      expect(screen.getByText('2 / 2')).toBeInTheDocument()
    })

    // Simulate swipe right (previous image)
    fireEvent.touchStart(carouselMain!, {
      touches: [{ clientX: 100, clientY: 100 }]
    })

    fireEvent.touchMove(carouselMain!, {
      touches: [{ clientX: 200, clientY: 100 }]
    })

    fireEvent.touchEnd(carouselMain!)

    // Should navigate back to first image
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument()
    })
  })

  it('should handle image loading errors with retry functionality', async () => {
    const user = userEvent.setup()
    const mockImages = [
      'https://example.com/broken-image.jpg'
    ]
    const mockOnImageError = vi.fn()

    render(
      <ImageCarousel 
        images={mockImages}
        onImageError={mockOnImageError}
        enableRetry={true}
      />
    )

    // Simulate image load error
    const image = screen.getByAltText('Image 1 of 1')
    fireEvent.error(image)

    // Verify error state is displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to load image/i)).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    // Verify error callback was called
    expect(mockOnImageError).toHaveBeenCalledWith(0, expect.stringContaining('Failed to load image'))

    // Click retry button
    const retryBtn = screen.getByText('Retry')
    await user.click(retryBtn)

    // Verify loading state is shown
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  it('should handle image loading success', async () => {
    const mockImages = [
      'https://example.com/image1.jpg'
    ]
    const mockOnImageLoad = vi.fn()

    render(
      <ImageCarousel 
        images={mockImages}
        onImageLoad={mockOnImageLoad}
      />
    )

    // Simulate successful image load
    const image = screen.getByAltText('Image 1 of 1')
    fireEvent.load(image)

    // Verify load callback was called
    expect(mockOnImageLoad).toHaveBeenCalledWith(0)

    // Verify no error state is shown
    expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument()
  })

  it('should display empty state when no images provided', () => {
    render(<ImageCarousel images={[]} />)

    // Verify empty state is displayed
    expect(screen.getByText(/no images to display/i)).toBeInTheDocument()
    expect(screen.getByText('🖼️')).toBeInTheDocument()

    // Verify no navigation controls are present
    expect(screen.queryByLabelText(/previous image/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/next image/i)).not.toBeInTheDocument()
  })

  it('should display single image without navigation controls', () => {
    const mockImages = ['https://example.com/single.jpg']

    render(<ImageCarousel images={mockImages} />)

    // Verify image is displayed
    const image = screen.getByAltText('Image 1 of 1')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/single.jpg')

    // Verify no navigation controls for single image
    expect(screen.queryByLabelText(/previous image/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/next image/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument()
  })

  it('should show dots instead of thumbnails for many images', () => {
    // Create array of 15 images (more than thumbnail threshold of 10)
    const mockImages = Array.from({ length: 15 }, (_, i) => 
      `https://example.com/image${i + 1}.jpg`
    )

    render(<ImageCarousel images={mockImages} />)

    // Verify dots are shown instead of thumbnails
    const dots = screen.getAllByLabelText(/go to image/i)
    expect(dots).toHaveLength(15)

    // Verify no thumbnail images are present
    expect(screen.queryByAltText(/thumbnail/i)).not.toBeInTheDocument()

    // Verify dots have correct classes
    expect(dots[0]).toHaveClass('image-carousel__dot--active')
    expect(dots[1]).not.toHaveClass('image-carousel__dot--active')
  })

  it('should handle rapid navigation without breaking', async () => {
    const user = userEvent.setup()
    const mockImages = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ]

    render(<ImageCarousel images={mockImages} />)

    const nextBtn = screen.getByLabelText('Next image')

    // Rapidly click next button multiple times
    await user.click(nextBtn)
    await user.click(nextBtn)
    await user.click(nextBtn)
    await user.click(nextBtn)

    // Should handle rapid clicks gracefully and show correct final state
    await waitFor(() => {
      // After 4 clicks from index 0: 0->1->2->0->1
      expect(screen.getByText('2 / 3')).toBeInTheDocument()
    })
  })
})