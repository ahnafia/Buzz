import React, { useState, useEffect, useCallback, useRef } from 'react'
import './ImageCarousel.css'

export interface ImageCarouselProps {
  images: string[]
  initialIndex?: number
  onImageChange?: (index: number) => void
  className?: string
  onImageError?: (index: number, error: string) => void
  onImageLoad?: (index: number) => void
  enableRetry?: boolean
}

interface TouchState {
  startX: number
  startY: number
  currentX: number
  isDragging: boolean
}

interface ImageState {
  loading: boolean
  error: boolean
  retryCount: number
  src: string
}

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_BASE = 1000 // 1 second base delay

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  initialIndex = 0,
  onImageChange,
  className = '',
  onImageError,
  onImageLoad,
  enableRetry = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [imageStates, setImageStates] = useState<Record<number, ImageState>>({})
  const [touchState, setTouchState] = useState<TouchState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    isDragging: false
  })

  const carouselRef = useRef<HTMLDivElement>(null)
  const imageRefs = useRef<(HTMLImageElement | null)[]>([])
  const retryTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({})

  // Initialize image states
  useEffect(() => {
    if (images && images.length > 0) {
      const initialStates: Record<number, ImageState> = {}
      images.forEach((src, index) => {
        initialStates[index] = {
          loading: true,
          error: false,
          retryCount: 0,
          src
        }
      })
      setImageStates(initialStates)
    }
  }, [images])

  // Cleanup retry timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(retryTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout)
      })
    }
  }, [])

  // Validate and normalize initial index
  useEffect(() => {
    if (images && images.length > 0) {
      const validIndex = Math.max(0, Math.min(initialIndex, images.length - 1))
      setCurrentIndex(validIndex)
    }
  }, [images?.length, initialIndex])

  // Notify parent of index changes
  useEffect(() => {
    if (onImageChange) {
      onImageChange(currentIndex)
    }
  }, [currentIndex, onImageChange])

  const sleep = useCallback((ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }, [])

  const retryImageLoad = useCallback(async (index: number, attempt: number = 0) => {
    if (!enableRetry || attempt >= MAX_RETRY_ATTEMPTS) {
      return
    }

    const delay = RETRY_DELAY_BASE * Math.pow(2, attempt) // Exponential backoff
    
    // Clear any existing timeout for this index
    if (retryTimeoutsRef.current[index]) {
      clearTimeout(retryTimeoutsRef.current[index])
    }

    retryTimeoutsRef.current[index] = setTimeout(() => {
      setImageStates(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          loading: true,
          error: false,
          retryCount: attempt + 1
        }
      }))

      // Force reload by updating the src with a cache-busting parameter
      const originalSrc = images[index]
      const cacheBustingSrc = `${originalSrc}${originalSrc.includes('?') ? '&' : '?'}retry=${attempt + 1}&t=${Date.now()}`
      
      if (imageRefs.current[index]) {
        imageRefs.current[index]!.src = cacheBustingSrc
      }
    }, delay)
  }, [enableRetry, images])

  const handleImageLoad = useCallback((index: number) => {
    setImageStates(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        loading: false,
        error: false
      }
    }))

    // Clear any retry timeout for this index
    if (retryTimeoutsRef.current[index]) {
      clearTimeout(retryTimeoutsRef.current[index])
      delete retryTimeoutsRef.current[index]
    }

    if (onImageLoad) {
      onImageLoad(index)
    }
  }, [onImageLoad])

  const handleImageError = useCallback((index: number) => {
    const currentState = imageStates[index]
    const retryCount = currentState?.retryCount || 0
    
    setImageStates(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        loading: false,
        error: true,
        retryCount
      }
    }))

    const errorMessage = `Failed to load image ${index + 1}${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}`
    
    if (onImageError) {
      onImageError(index, errorMessage)
    }

    // Attempt retry if enabled and within limits
    if (enableRetry && retryCount < MAX_RETRY_ATTEMPTS) {
      retryImageLoad(index, retryCount)
    }
  }, [imageStates, onImageError, enableRetry, retryImageLoad])

  const handleImageLoadStart = useCallback((index: number) => {
    setImageStates(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        loading: true,
        error: false
      }
    }))
  }, [])

  const manualRetry = useCallback((index: number) => {
    if (retryTimeoutsRef.current[index]) {
      clearTimeout(retryTimeoutsRef.current[index])
      delete retryTimeoutsRef.current[index]
    }

    setImageStates(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        loading: true,
        error: false,
        retryCount: 0
      }
    }))

    // Force reload with cache-busting
    const originalSrc = images[index]
    const cacheBustingSrc = `${originalSrc}${originalSrc.includes('?') ? '&' : '?'}manual_retry=${Date.now()}`
    
    if (imageRefs.current[index]) {
      imageRefs.current[index]!.src = cacheBustingSrc
    }
  }, [images])

  const goToImage = useCallback((index: number) => {
    if (images && index >= 0 && index < images.length) {
      setCurrentIndex(index)
    }
  }, [images?.length])

  const goToPrevious = useCallback(() => {
    if (!images || images.length === 0) return
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
  }, [images?.length])

  const goToNext = useCallback(() => {
    if (!images || images.length === 0) return
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
  }, [images?.length])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        goToPrevious()
        break
      case 'ArrowRight':
        e.preventDefault()
        goToNext()
        break
      case 'Home':
        e.preventDefault()
        goToImage(0)
        break
      case 'End':
        e.preventDefault()
        goToImage((images?.length || 1) - 1)
        break
    }
  }, [goToPrevious, goToNext, goToImage, images?.length])

  // Touch/swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      isDragging: true
    })
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.isDragging) return

    const touch = e.touches[0]
    setTouchState(prev => ({
      ...prev,
      currentX: touch.clientX
    }))

    // Prevent scrolling if horizontal swipe is detected
    const deltaX = Math.abs(touch.clientX - touchState.startX)
    const deltaY = Math.abs(touch.clientY - touchState.startY)
    
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault()
    }
  }, [touchState.isDragging, touchState.startX, touchState.startY])

  const handleTouchEnd = useCallback(() => {
    if (!touchState.isDragging) return

    const deltaX = touchState.currentX - touchState.startX
    const threshold = 50 // Minimum swipe distance

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        goToPrevious()
      } else {
        goToNext()
      }
    }

    setTouchState({
      startX: 0,
      startY: 0,
      currentX: 0,
      isDragging: false
    })
  }, [touchState, goToPrevious, goToNext])

  // Preload adjacent images for better performance
  useEffect(() => {
    if (!images || images.length === 0) return
    
    const preloadImage = (src: string) => {
      const img = new Image()
      img.src = src
    }

    // Preload current, next, and previous images
    const indicesToPreload = [
      currentIndex,
      currentIndex > 0 ? currentIndex - 1 : images.length - 1,
      currentIndex < images.length - 1 ? currentIndex + 1 : 0
    ]

    indicesToPreload.forEach(index => {
      if (images[index]) {
        preloadImage(images[index])
      }
    })
  }, [currentIndex, images])

  if (!images || images.length === 0) {
    return (
      <div className={`image-carousel image-carousel--empty ${className}`}>
        <div className="image-carousel__empty-state">
          <div className="image-carousel__empty-icon">🖼️</div>
          <div className="image-carousel__empty-text">No images to display</div>
        </div>
      </div>
    )
  }

  const showNavigation = images && images.length > 1
  const showThumbnails = images && images.length > 1 && images.length <= 10 // Only show thumbnails for reasonable number of images

  return (
    <div 
      className={`image-carousel ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`Image carousel with ${images?.length || 0} images`}
    >
      {/* Main image display */}
      <div 
        className="image-carousel__main"
        ref={carouselRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="image-carousel__track"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((src, index) => {
            const imageState = imageStates[index]
            const isLoading = imageState?.loading || false
            const hasError = imageState?.error || false
            const retryCount = imageState?.retryCount || 0
            
            return (
              <div key={`${src}-${index}`} className="image-carousel__slide">
                {isLoading && (
                  <div className="image-carousel__loading">
                    <div className="image-carousel__loading-spinner"></div>
                    <div className="image-carousel__loading-text">
                      Loading...
                      {retryCount > 0 && ` (Retry ${retryCount}/${MAX_RETRY_ATTEMPTS})`}
                    </div>
                  </div>
                )}
                
                {hasError ? (
                  <div className="image-carousel__error">
                    <div className="image-carousel__error-icon">⚠️</div>
                    <div className="image-carousel__error-text">
                      Failed to load image
                      {retryCount > 0 && ` (${retryCount} attempts)`}
                    </div>
                    {enableRetry && retryCount < MAX_RETRY_ATTEMPTS && (
                      <button
                        className="image-carousel__retry-btn"
                        onClick={() => manualRetry(index)}
                        type="button"
                        aria-label={`Retry loading image ${index + 1}`}
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ) : (
                  <img
                    ref={el => imageRefs.current[index] = el}
                    src={src}
                    alt={`Image ${index + 1} of ${images?.length || 0}`}
                    className="image-carousel__image"
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageError(index)}
                    onLoadStart={() => handleImageLoadStart(index)}
                    loading={index === currentIndex ? 'eager' : 'lazy'}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Navigation arrows */}
        {showNavigation && (
          <>
            <button
              className="image-carousel__nav image-carousel__nav--prev"
              onClick={goToPrevious}
              aria-label="Previous image"
              type="button"
            >
              <span className="image-carousel__nav-icon">‹</span>
            </button>
            <button
              className="image-carousel__nav image-carousel__nav--next"
              onClick={goToNext}
              aria-label="Next image"
              type="button"
            >
              <span className="image-carousel__nav-icon">›</span>
            </button>
          </>
        )}

        {/* Image counter */}
        {showNavigation && (
          <div className="image-carousel__counter">
            {currentIndex + 1} / {images?.length || 0}
          </div>
        )}
      </div>

      {/* Thumbnail indicators */}
      {showThumbnails && (
        <div className="image-carousel__thumbnails">
          {images.map((src, index) => (
            <button
              key={`thumb-${src}-${index}`}
              className={`image-carousel__thumbnail ${
                index === currentIndex ? 'image-carousel__thumbnail--active' : ''
              }`}
              onClick={() => goToImage(index)}
              aria-label={`Go to image ${index + 1}`}
              type="button"
            >
              <img
                src={src}
                alt={`Thumbnail ${index + 1}`}
                className="image-carousel__thumbnail-image"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Dot indicators for many images */}
      {!showThumbnails && showNavigation && (
        <div className="image-carousel__dots">
          {images.map((_, index) => (
            <button
              key={`dot-${index}`}
              className={`image-carousel__dot ${
                index === currentIndex ? 'image-carousel__dot--active' : ''
              }`}
              onClick={() => goToImage(index)}
              aria-label={`Go to image ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageCarousel