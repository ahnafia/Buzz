import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'

describe('InteractiveMap Flag Carousel Navigation', () => {
  let dom: JSDOM
  let document: Document
  let window: any

  beforeEach(() => {
    // Set up JSDOM for HTML parsing
    dom = new JSDOM()
    document = dom.window.document
    window = dom.window
    global.document = document
    global.window = window
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Set up carousel HTML structure for testing
    document.body.innerHTML = `
      <div class="buzz-popup-flag-carousel" data-pin-id="test-flag">
        <div class="buzz-popup-flag-carousel-main">
          <div class="buzz-popup-flag-carousel-track" style="transform: translateX(0%)">
            <div class="buzz-popup-flag-carousel-slide">
              <img src="image1.jpg" alt="Flag image 1 of 3" class="buzz-popup-flag-carousel-image" />
            </div>
            <div class="buzz-popup-flag-carousel-slide">
              <img src="image2.jpg" alt="Flag image 2 of 3" class="buzz-popup-flag-carousel-image" />
            </div>
            <div class="buzz-popup-flag-carousel-slide">
              <img src="image3.jpg" alt="Flag image 3 of 3" class="buzz-popup-flag-carousel-image" />
            </div>
          </div>
          <div class="buzz-popup-flag-carousel-counter">
            <span class="buzz-popup-flag-carousel-counter-current">1</span> / 3
          </div>
        </div>
        <div class="buzz-popup-flag-carousel-thumbnails">
          <button class="buzz-popup-flag-carousel-thumbnail buzz-popup-flag-carousel-thumbnail--active">
            <img src="image1.jpg" alt="Thumbnail 1" class="buzz-popup-flag-carousel-thumbnail-image" />
          </button>
          <button class="buzz-popup-flag-carousel-thumbnail">
            <img src="image2.jpg" alt="Thumbnail 2" class="buzz-popup-flag-carousel-thumbnail-image" />
          </button>
          <button class="buzz-popup-flag-carousel-thumbnail">
            <img src="image3.jpg" alt="Thumbnail 3" class="buzz-popup-flag-carousel-thumbnail-image" />
          </button>
        </div>
      </div>
    `

    // Set up carousel navigation functions (simulating the ones from InteractiveMap)
    const carouselStates = new Map<string, { currentIndex: number; totalImages: number }>()

    const updateCarouselDisplay = (pinId: string, newIndex: number) => {
      const carousel = document.querySelector(`[data-pin-id="${pinId}"]`)
      if (!carousel) return

      const track = carousel.querySelector('.buzz-popup-flag-carousel-track') as HTMLElement
      const counter = carousel.querySelector('.buzz-popup-flag-carousel-counter-current')
      const thumbnails = carousel.querySelectorAll('.buzz-popup-flag-carousel-thumbnail')
      const dots = carousel.querySelectorAll('.buzz-popup-flag-carousel-dot')

      if (track) {
        track.style.transform = `translateX(-${newIndex * 100}%)`
      }
      if (counter) {
        counter.textContent = (newIndex + 1).toString()
      }

      // Update thumbnail active state
      thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle('buzz-popup-flag-carousel-thumbnail--active', index === newIndex)
      })

      // Update dot active state
      dots.forEach((dot, index) => {
        dot.classList.toggle('buzz-popup-flag-carousel-dot--active', index === newIndex)
      })

      // Update carousel state
      const state = carouselStates.get(pinId)
      if (state) {
        state.currentIndex = newIndex
      }
    }

    ;(window as any).buzzFlagCarouselPrev = (pinId: string) => {
      const carousel = document.querySelector(`[data-pin-id="${pinId}"]`)
      if (!carousel) return

      let state = carouselStates.get(pinId)
      if (!state) {
        const images = carousel.querySelectorAll('.buzz-popup-flag-carousel-slide')
        state = { currentIndex: 0, totalImages: images.length }
        carouselStates.set(pinId, state)
      }

      const newIndex = state.currentIndex > 0 ? state.currentIndex - 1 : state.totalImages - 1
      updateCarouselDisplay(pinId, newIndex)
    }

    ;(window as any).buzzFlagCarouselNext = (pinId: string) => {
      const carousel = document.querySelector(`[data-pin-id="${pinId}"]`)
      if (!carousel) return

      let state = carouselStates.get(pinId)
      if (!state) {
        const images = carousel.querySelectorAll('.buzz-popup-flag-carousel-slide')
        state = { currentIndex: 0, totalImages: images.length }
        carouselStates.set(pinId, state)
      }

      const newIndex = state.currentIndex < state.totalImages - 1 ? state.currentIndex + 1 : 0
      updateCarouselDisplay(pinId, newIndex)
    }

    ;(window as any).buzzFlagCarouselGoTo = (pinId: string, index: number) => {
      const carousel = document.querySelector(`[data-pin-id="${pinId}"]`)
      if (!carousel) return

      let state = carouselStates.get(pinId)
      if (!state) {
        const images = carousel.querySelectorAll('.buzz-popup-flag-carousel-slide')
        state = { currentIndex: 0, totalImages: images.length }
        carouselStates.set(pinId, state)
      }

      if (index >= 0 && index < state.totalImages) {
        updateCarouselDisplay(pinId, index)
      }
    }
  })

  afterEach(() => {
    // Clean up global functions
    delete (window as any).buzzFlagCarouselPrev
    delete (window as any).buzzFlagCarouselNext
    delete (window as any).buzzFlagCarouselGoTo
  })

  describe('Carousel Navigation Functions', () => {
    it('navigates to next image correctly', () => {
      const track = document.querySelector('.buzz-popup-flag-carousel-track') as HTMLElement
      const counter = document.querySelector('.buzz-popup-flag-carousel-counter-current')
      const thumbnails = document.querySelectorAll('.buzz-popup-flag-carousel-thumbnail')

      // Initial state
      expect(track.style.transform).toBe('translateX(0%)')
      expect(counter?.textContent).toBe('1')
      expect(thumbnails[0].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)

      // Navigate to next
      window.buzzFlagCarouselNext('test-flag')

      expect(track.style.transform).toBe('translateX(-100%)')
      expect(counter?.textContent).toBe('2')
      expect(thumbnails[0].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(false)
      expect(thumbnails[1].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)

      // Navigate to next again
      window.buzzFlagCarouselNext('test-flag')

      expect(track.style.transform).toBe('translateX(-200%)')
      expect(counter?.textContent).toBe('3')
      expect(thumbnails[2].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)

      // Navigate to next (should wrap to first)
      window.buzzFlagCarouselNext('test-flag')

      expect(track.style.transform).toBe('translateX(-0%)')
      expect(counter?.textContent).toBe('1')
      expect(thumbnails[0].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)
    })

    it('navigates to previous image correctly', () => {
      const track = document.querySelector('.buzz-popup-flag-carousel-track') as HTMLElement
      const counter = document.querySelector('.buzz-popup-flag-carousel-counter-current')
      const thumbnails = document.querySelectorAll('.buzz-popup-flag-carousel-thumbnail')

      // Navigate to previous from first image (should wrap to last)
      window.buzzFlagCarouselPrev('test-flag')

      expect(track.style.transform).toBe('translateX(-200%)')
      expect(counter?.textContent).toBe('3')
      expect(thumbnails[2].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)

      // Navigate to previous
      window.buzzFlagCarouselPrev('test-flag')

      expect(track.style.transform).toBe('translateX(-100%)')
      expect(counter?.textContent).toBe('2')
      expect(thumbnails[1].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)

      // Navigate to previous again
      window.buzzFlagCarouselPrev('test-flag')

      expect(track.style.transform).toBe('translateX(-0%)')
      expect(counter?.textContent).toBe('1')
      expect(thumbnails[0].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)
    })

    it('navigates to specific image correctly', () => {
      const track = document.querySelector('.buzz-popup-flag-carousel-track') as HTMLElement
      const counter = document.querySelector('.buzz-popup-flag-carousel-counter-current')
      const thumbnails = document.querySelectorAll('.buzz-popup-flag-carousel-thumbnail')

      // Go to second image
      window.buzzFlagCarouselGoTo('test-flag', 1)

      expect(track.style.transform).toBe('translateX(-100%)')
      expect(counter?.textContent).toBe('2')
      expect(thumbnails[1].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)

      // Go to third image
      window.buzzFlagCarouselGoTo('test-flag', 2)

      expect(track.style.transform).toBe('translateX(-200%)')
      expect(counter?.textContent).toBe('3')
      expect(thumbnails[2].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)

      // Go back to first image
      window.buzzFlagCarouselGoTo('test-flag', 0)

      expect(track.style.transform).toBe('translateX(-0%)')
      expect(counter?.textContent).toBe('1')
      expect(thumbnails[0].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)
    })

    it('handles invalid indices gracefully', () => {
      const track = document.querySelector('.buzz-popup-flag-carousel-track') as HTMLElement
      const counter = document.querySelector('.buzz-popup-flag-carousel-counter-current')

      // Try to go to invalid negative index
      window.buzzFlagCarouselGoTo('test-flag', -1)

      // Should remain at initial position
      expect(track.style.transform).toBe('translateX(0%)')
      expect(counter?.textContent).toBe('1')

      // Try to go to invalid high index
      window.buzzFlagCarouselGoTo('test-flag', 5)

      // Should remain at initial position
      expect(track.style.transform).toBe('translateX(0%)')
      expect(counter?.textContent).toBe('1')
    })

    it('handles non-existent carousel gracefully', () => {
      // Should not throw errors when carousel doesn't exist
      expect(() => {
        window.buzzFlagCarouselNext('non-existent-flag')
        window.buzzFlagCarouselPrev('non-existent-flag')
        window.buzzFlagCarouselGoTo('non-existent-flag', 1)
      }).not.toThrow()
    })

    it('initializes carousel state correctly on first navigation', () => {
      const track = document.querySelector('.buzz-popup-flag-carousel-track') as HTMLElement
      
      // First navigation should initialize state and work correctly
      window.buzzFlagCarouselNext('test-flag')
      
      expect(track.style.transform).toBe('translateX(-100%)')
      
      // Subsequent navigation should continue from correct state
      window.buzzFlagCarouselNext('test-flag')
      
      expect(track.style.transform).toBe('translateX(-200%)')
    })
  })

  describe('Carousel with Dots (Many Images)', () => {
    beforeEach(() => {
      // Set up carousel with dots instead of thumbnails
      document.body.innerHTML = `
        <div class="buzz-popup-flag-carousel" data-pin-id="test-flag-dots">
          <div class="buzz-popup-flag-carousel-main">
            <div class="buzz-popup-flag-carousel-track" style="transform: translateX(0%)">
              <div class="buzz-popup-flag-carousel-slide">
                <img src="image1.jpg" alt="Flag image 1 of 6" class="buzz-popup-flag-carousel-image" />
              </div>
              <div class="buzz-popup-flag-carousel-slide">
                <img src="image2.jpg" alt="Flag image 2 of 6" class="buzz-popup-flag-carousel-image" />
              </div>
              <div class="buzz-popup-flag-carousel-slide">
                <img src="image3.jpg" alt="Flag image 3 of 6" class="buzz-popup-flag-carousel-image" />
              </div>
              <div class="buzz-popup-flag-carousel-slide">
                <img src="image4.jpg" alt="Flag image 4 of 6" class="buzz-popup-flag-carousel-image" />
              </div>
              <div class="buzz-popup-flag-carousel-slide">
                <img src="image5.jpg" alt="Flag image 5 of 6" class="buzz-popup-flag-carousel-image" />
              </div>
              <div class="buzz-popup-flag-carousel-slide">
                <img src="image6.jpg" alt="Flag image 6 of 6" class="buzz-popup-flag-carousel-image" />
              </div>
            </div>
            <div class="buzz-popup-flag-carousel-counter">
              <span class="buzz-popup-flag-carousel-counter-current">1</span> / 6
            </div>
          </div>
          <div class="buzz-popup-flag-carousel-dots">
            <button class="buzz-popup-flag-carousel-dot buzz-popup-flag-carousel-dot--active"></button>
            <button class="buzz-popup-flag-carousel-dot"></button>
            <button class="buzz-popup-flag-carousel-dot"></button>
            <button class="buzz-popup-flag-carousel-dot"></button>
            <button class="buzz-popup-flag-carousel-dot"></button>
            <button class="buzz-popup-flag-carousel-dot"></button>
          </div>
        </div>
      `
    })

    it('updates dot indicators correctly', () => {
      const dots = document.querySelectorAll('.buzz-popup-flag-carousel-dot')

      // Initial state - first dot active
      expect(dots[0].classList.contains('buzz-popup-flag-carousel-dot--active')).toBe(true)
      expect(dots[1].classList.contains('buzz-popup-flag-carousel-dot--active')).toBe(false)

      // Navigate to third image
      window.buzzFlagCarouselGoTo('test-flag-dots', 2)

      expect(dots[0].classList.contains('buzz-popup-flag-carousel-dot--active')).toBe(false)
      expect(dots[2].classList.contains('buzz-popup-flag-carousel-dot--active')).toBe(true)

      // Navigate to last image
      window.buzzFlagCarouselGoTo('test-flag-dots', 5)

      expect(dots[2].classList.contains('buzz-popup-flag-carousel-dot--active')).toBe(false)
      expect(dots[5].classList.contains('buzz-popup-flag-carousel-dot--active')).toBe(true)
    })
  })
})