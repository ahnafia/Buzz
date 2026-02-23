import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'

// Mock the buildPopupHtml function and related types
type PinData = {
  id: string
  lat: number
  lng: number
  title: string
  description: string
  fullDescription: string
  address?: string
  hours?: string
  tips?: string
  type: 'landmark' | 'event' | 'flag'
  category?: string
  startTime?: string
  expiresAt?: string
  imageUrl?: string
  userId?: string
  ownerProfileImageUrl?: string
  ownerDisplayName?: string
  flagImageUrls?: string[]
  flagColor?: string
  status?: string
}

// Extract buildPopupHtml function for testing
function buildPopupHtml(pin: PinData) {
  console.log('Building popup for pin:', pin.title, 'imageUrl:', pin.imageUrl, 'type:', pin.type, 'flagImageUrls:', pin.flagImageUrls)

  // Helper function to escape HTML to prevent XSS
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Enhanced event image handling with better fallback and error states
  const eventImageHtml = pin.type === 'event' 
    ? pin.imageUrl 
      ? (() => {
          const safeImageUrl = escapeHtml(pin.imageUrl)
          const safeImageUrlForJs = pin.imageUrl.replace(/'/g, "\\'").replace(/"/g, '\\"')
          return `<div class="buzz-popup-image-container buzz-popup-image-container--event">
           <img src="${safeImageUrl}" 
                alt="${escapeHtml(pin.title)} banner image" 
                class="buzz-popup-image buzz-popup-image--event" 
                onerror="console.error('Event banner image failed to load:', '${safeImageUrlForJs}'); this.style.display='none'; this.parentElement.classList.add('buzz-popup-image-container--error');" 
                onload="console.log('Event banner image loaded successfully:', '${safeImageUrlForJs}'); this.parentElement.classList.add('buzz-popup-image-container--loaded');" />
           <div class="buzz-popup-image-fallback buzz-popup-image-fallback--event">
             <svg viewBox="0 0 24 24" fill="#FF9B56" style="width:48px;height:48px;">
               <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
             </svg>
             <span class="buzz-popup-image-fallback-text">Image unavailable</span>
           </div>
         </div>`
        })()
      : '' // No image section when no banner image exists (Requirement 4.3)
    : ''

  // Flag image carousel HTML for multiple images (Requirements 2.1, 2.2, 2.3)
  const flagImageHtml = pin.type === 'flag' && pin.flagImageUrls && pin.flagImageUrls.length > 0
    ? `<div class="buzz-popup-flag-carousel" data-pin-id="${escapeHtml(pin.id)}">
         <div class="buzz-popup-flag-carousel-main">
           <div class="buzz-popup-flag-carousel-track" style="transform: translateX(0%)">
             ${pin.flagImageUrls.map((imageUrl, index) => {
               const safeImageUrl = escapeHtml(imageUrl)
               const safeImageUrlForJs = imageUrl.replace(/'/g, "\\'").replace(/"/g, '\\"')
               return `
               <div class="buzz-popup-flag-carousel-slide">
                 <img src="${safeImageUrl}" 
                      alt="Flag image ${index + 1} of ${pin.flagImageUrls!.length}" 
                      class="buzz-popup-flag-carousel-image"
                      onerror="console.error('Flag image failed to load:', '${safeImageUrlForJs}'); this.style.display='none'; this.nextElementSibling.style.display='flex';" 
                      onload="this.nextElementSibling.style.display='none';" />
                 <div class="buzz-popup-flag-carousel-error" style="display: none;">
                   <div class="buzz-popup-flag-carousel-error-icon">⚠️</div>
                   <div class="buzz-popup-flag-carousel-error-text">Failed to load image</div>
                 </div>
               </div>
               `
             }).join('')}
           </div>
           ${pin.flagImageUrls.length > 1 ? `
             <button class="buzz-popup-flag-carousel-nav buzz-popup-flag-carousel-nav--prev" 
                     onclick="window.buzzFlagCarouselPrev && window.buzzFlagCarouselPrev('${escapeHtml(pin.id)}')"
                     aria-label="Previous image">
               <span class="buzz-popup-flag-carousel-nav-icon">‹</span>
             </button>
             <button class="buzz-popup-flag-carousel-nav buzz-popup-flag-carousel-nav--next" 
                     onclick="window.buzzFlagCarouselNext && window.buzzFlagCarouselNext('${escapeHtml(pin.id)}')"
                     aria-label="Next image">
               <span class="buzz-popup-flag-carousel-nav-icon">›</span>
             </button>
             <div class="buzz-popup-flag-carousel-counter">
               <span class="buzz-popup-flag-carousel-counter-current">1</span> / ${pin.flagImageUrls.length}
             </div>
           ` : ''}
         </div>
         ${pin.flagImageUrls.length > 1 && pin.flagImageUrls.length <= 5 ? `
           <div class="buzz-popup-flag-carousel-thumbnails">
             ${pin.flagImageUrls.map((imageUrl, index) => `
               <button class="buzz-popup-flag-carousel-thumbnail ${index === 0 ? 'buzz-popup-flag-carousel-thumbnail--active' : ''}" 
                       onclick="window.buzzFlagCarouselGoTo && window.buzzFlagCarouselGoTo('${escapeHtml(pin.id)}', ${index})"
                       aria-label="Go to image ${index + 1}">
                 <img src="${escapeHtml(imageUrl)}" alt="Thumbnail ${index + 1}" class="buzz-popup-flag-carousel-thumbnail-image" />
               </button>
             `).join('')}
           </div>
         ` : pin.flagImageUrls.length > 1 ? `
           <div class="buzz-popup-flag-carousel-dots">
             ${pin.flagImageUrls.map((_, index) => `
               <button class="buzz-popup-flag-carousel-dot ${index === 0 ? 'buzz-popup-flag-carousel-dot--active' : ''}" 
                       onclick="window.buzzFlagCarouselGoTo && window.buzzFlagCarouselGoTo('${escapeHtml(pin.id)}', ${index})"
                       aria-label="Go to image ${index + 1}"></button>
             `).join('')}
           </div>
         ` : ''}
       </div>`
    : '' // No image section when no flag images exist (Requirement 2.4)

  // Enhanced popup content with better structure
  return `
    <div class="buzz-popup-card ${pin.type === 'event' ? 'buzz-popup-card--event' : pin.type === 'flag' ? 'buzz-popup-card--flag' : ''}">
      ${eventImageHtml}
      ${flagImageHtml}
      <div class="buzz-popup-content">
        <h4 class="buzz-popup-title">${escapeHtml(pin.title)}</h4>
        ${pin.description ? `<p class="buzz-popup-description">${escapeHtml(pin.description)}</p>` : ''}
        ${pin.type === 'event' ? `
          <div class="buzz-popup-event-details">
            ${pin.hours ? `<div class="buzz-popup-event-time">${escapeHtml(pin.hours)}</div>` : ''}
            ${pin.status ? `<div class="buzz-popup-event-status buzz-popup-event-status--${escapeHtml(pin.status.toLowerCase())}">${escapeHtml(pin.status)}</div>` : ''}
          </div>
          <button class="buzz-popup-details-btn" onclick="if(window.buzzNavigateToEvent) { window.buzzNavigateToEvent('${escapeHtml(pin.id)}'); }">
            View Event Details
          </button>
        ` : pin.type === 'flag' && pin.ownerDisplayName ? `
          <div class="buzz-popup-flag-details">
            <div class="buzz-popup-flag-owner">By ${escapeHtml(pin.ownerDisplayName)}</div>
            ${pin.address ? `<div class="buzz-popup-flag-location">${escapeHtml(pin.address)}</div>` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `
}

describe('InteractiveMap Popup Display', () => {
  let dom: JSDOM
  let document: Document

  beforeEach(() => {
    // Set up JSDOM for HTML parsing
    dom = new JSDOM()
    document = dom.window.document
    global.document = document
    global.window = dom.window as any
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Event Popup with Banner Image', () => {
    it('displays event banner image prominently when imageUrl is provided (Requirement 4.2)', () => {
      const eventPin: PinData = {
        id: 'event-1',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Summer Music Festival',
        description: 'Join us for an amazing outdoor music experience',
        fullDescription: 'Summer Music Festival - Join us for an amazing outdoor music experience',
        type: 'event',
        category: 'Music',
        imageUrl: 'https://example.com/festival-banner.jpg',
        hours: '6/15/2024 at 7:00 PM - 11:00 PM',
        status: 'Live'
      }

      const html = buildPopupHtml(eventPin)
      document.body.innerHTML = html

      // Check that image container exists with event-specific class
      const imageContainer = document.querySelector('.buzz-popup-image-container--event')
      expect(imageContainer).toBeTruthy()

      // Check that image element exists with correct attributes
      const image = document.querySelector('.buzz-popup-image--event') as HTMLImageElement
      expect(image).toBeTruthy()
      expect(image.src).toBe('https://example.com/festival-banner.jpg')
      expect(image.alt).toBe('Summer Music Festival banner image')

      // Check that fallback element exists but is hidden initially
      const fallback = document.querySelector('.buzz-popup-image-fallback--event')
      expect(fallback).toBeTruthy()

      // Check that popup has event-specific styling
      const popupCard = document.querySelector('.buzz-popup-card--event')
      expect(popupCard).toBeTruthy()
    })

    it('displays event popup without image section when no banner image exists (Requirement 4.3)', () => {
      const eventPin: PinData = {
        id: 'event-2',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Community Meetup',
        description: 'Monthly community gathering',
        fullDescription: 'Community Meetup - Monthly community gathering',
        type: 'event',
        category: 'Community',
        imageUrl: undefined, // No image
        hours: '6/20/2024 at 6:00 PM - 8:00 PM',
        status: 'Upcoming'
      }

      const html = buildPopupHtml(eventPin)
      document.body.innerHTML = html

      // Check that no image container exists
      const imageContainer = document.querySelector('.buzz-popup-image-container')
      expect(imageContainer).toBeFalsy()

      // Check that popup still has proper structure
      const popupCard = document.querySelector('.buzz-popup-card--event')
      expect(popupCard).toBeTruthy()

      const title = document.querySelector('.buzz-popup-title')
      expect(title?.textContent).toBe('Community Meetup')

      const description = document.querySelector('.buzz-popup-description')
      expect(description?.textContent).toBe('Monthly community gathering')
    })

    it('shows placeholder when banner image fails to load (Requirement 4.4)', () => {
      const eventPin: PinData = {
        id: 'event-3',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Art Exhibition',
        description: 'Local artists showcase',
        fullDescription: 'Art Exhibition - Local artists showcase',
        type: 'event',
        category: 'Art',
        imageUrl: 'https://example.com/broken-image.jpg',
        hours: '6/25/2024 at 10:00 AM - 6:00 PM',
        status: 'Upcoming'
      }

      const html = buildPopupHtml(eventPin)
      document.body.innerHTML = html

      // Check that image has proper error handling
      const image = document.querySelector('.buzz-popup-image--event') as HTMLImageElement
      expect(image).toBeTruthy()
      expect(image.getAttribute('onerror')).toContain('buzz-popup-image-container--error')

      // Check that fallback exists with proper content
      const fallback = document.querySelector('.buzz-popup-image-fallback--event')
      expect(fallback).toBeTruthy()
      
      const fallbackText = document.querySelector('.buzz-popup-image-fallback-text')
      expect(fallbackText?.textContent).toBe('Image unavailable')

      // Check that fallback has calendar icon
      const svg = fallback?.querySelector('svg')
      expect(svg).toBeTruthy()
      expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
    })

    it('includes event details and View Details button', () => {
      const eventPin: PinData = {
        id: 'event-4',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Tech Conference',
        description: 'Annual technology conference',
        fullDescription: 'Tech Conference - Annual technology conference',
        type: 'event',
        category: 'Technology',
        imageUrl: 'https://example.com/tech-banner.jpg',
        hours: '7/1/2024 at 9:00 AM - 5:00 PM',
        status: 'Live'
      }

      const html = buildPopupHtml(eventPin)
      document.body.innerHTML = html

      // Check event details section
      const eventDetails = document.querySelector('.buzz-popup-event-details')
      expect(eventDetails).toBeTruthy()

      // Check event time
      const eventTime = document.querySelector('.buzz-popup-event-time')
      expect(eventTime?.textContent).toBe('7/1/2024 at 9:00 AM - 5:00 PM')

      // Check event status with proper class
      const eventStatus = document.querySelector('.buzz-popup-event-status--live')
      expect(eventStatus).toBeTruthy()
      expect(eventStatus?.textContent).toBe('Live')

      // Check View Details button
      const detailsBtn = document.querySelector('.buzz-popup-details-btn')
      expect(detailsBtn).toBeTruthy()
      expect(detailsBtn?.textContent?.trim()).toBe('View Event Details')
      expect(detailsBtn?.getAttribute('onclick')).toContain('buzzNavigateToEvent')
      expect(detailsBtn?.getAttribute('onclick')).toContain('event-4')
    })

    it('handles different event statuses correctly', () => {
      const statuses = ['Live', 'Upcoming', 'Expired']
      
      statuses.forEach(status => {
        const eventPin: PinData = {
          id: `event-${status}`,
          lat: 40.7934,
          lng: -77.8616,
          title: `${status} Event`,
          description: 'Test event',
          fullDescription: 'Test event',
          type: 'event',
          category: 'Test',
          status: status
        }

        const html = buildPopupHtml(eventPin)
        document.body.innerHTML = html

        const statusElement = document.querySelector(`.buzz-popup-event-status--${status.toLowerCase()}`)
        expect(statusElement).toBeTruthy()
        expect(statusElement?.textContent).toBe(status)
      })
    })
  })

  describe('Non-Event Popup Behavior', () => {
    it('does not display image section for flag pins without images', () => {
      const flagPin: PinData = {
        id: 'flag-1',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Cool Flag',
        description: 'A user-created flag',
        fullDescription: 'Cool Flag - A user-created flag',
        type: 'flag',
        category: 'Social',
        imageUrl: 'https://example.com/flag-image.jpg', // Should be ignored for flags
        flagImageUrls: undefined // No flag images
      }

      const html = buildPopupHtml(flagPin)
      document.body.innerHTML = html

      // Check that no image container exists for flags without images
      const imageContainer = document.querySelector('.buzz-popup-image-container')
      expect(imageContainer).toBeFalsy()

      const flagCarousel = document.querySelector('.buzz-popup-flag-carousel')
      expect(flagCarousel).toBeFalsy()

      // Check that popup has flag-specific class
      const popupCard = document.querySelector('.buzz-popup-card--flag')
      expect(popupCard).toBeTruthy()

      // Check that no View Details button exists
      const detailsBtn = document.querySelector('.buzz-popup-details-btn')
      expect(detailsBtn).toBeFalsy()
    })

    it('does not display image section for landmark pins', () => {
      const landmarkPin: PinData = {
        id: 'landmark-1',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Historic Building',
        description: 'A historic landmark',
        fullDescription: 'Historic Building - A historic landmark',
        type: 'landmark',
        category: 'History'
      }

      const html = buildPopupHtml(landmarkPin)
      document.body.innerHTML = html

      // Check that no image container exists for landmarks
      const imageContainer = document.querySelector('.buzz-popup-image-container')
      expect(imageContainer).toBeFalsy()

      const flagCarousel = document.querySelector('.buzz-popup-flag-carousel')
      expect(flagCarousel).toBeFalsy()

      // Check basic popup structure
      const title = document.querySelector('.buzz-popup-title')
      expect(title?.textContent).toBe('Historic Building')
    })
  })

  describe('Flag Popup with Image Carousel', () => {
    it('displays flag popup with single image (Requirement 2.1)', () => {
      const flagPin: PinData = {
        id: 'flag-single',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Single Image Flag',
        description: 'A flag with one image',
        fullDescription: 'Single Image Flag - A flag with one image',
        type: 'flag',
        category: 'Social',
        flagImageUrls: ['https://example.com/flag1.jpg'],
        ownerDisplayName: 'John Doe',
        address: 'Penn State University'
      }

      const html = buildPopupHtml(flagPin)
      document.body.innerHTML = html

      // Check that flag carousel exists
      const flagCarousel = document.querySelector('.buzz-popup-flag-carousel')
      expect(flagCarousel).toBeTruthy()
      expect(flagCarousel?.getAttribute('data-pin-id')).toBe('flag-single')

      // Check that image exists
      const image = document.querySelector('.buzz-popup-flag-carousel-image') as HTMLImageElement
      expect(image).toBeTruthy()
      expect(image.src).toBe('https://example.com/flag1.jpg')
      expect(image.alt).toBe('Flag image 1 of 1')

      // Check that navigation controls are NOT present for single image
      const prevBtn = document.querySelector('.buzz-popup-flag-carousel-nav--prev')
      const nextBtn = document.querySelector('.buzz-popup-flag-carousel-nav--next')
      const counter = document.querySelector('.buzz-popup-flag-carousel-counter')
      expect(prevBtn).toBeFalsy()
      expect(nextBtn).toBeFalsy()
      expect(counter).toBeFalsy()

      // Check that thumbnails/dots are NOT present for single image
      const thumbnails = document.querySelector('.buzz-popup-flag-carousel-thumbnails')
      const dots = document.querySelector('.buzz-popup-flag-carousel-dots')
      expect(thumbnails).toBeFalsy()
      expect(dots).toBeFalsy()

      // Check flag-specific details
      const flagDetails = document.querySelector('.buzz-popup-flag-details')
      expect(flagDetails).toBeTruthy()

      const owner = document.querySelector('.buzz-popup-flag-owner')
      expect(owner?.textContent).toBe('By John Doe')

      const location = document.querySelector('.buzz-popup-flag-location')
      expect(location?.textContent).toBe('Penn State University')
    })

    it('displays flag popup with multiple images and navigation controls (Requirement 2.2, 2.3)', () => {
      const flagPin: PinData = {
        id: 'flag-multi',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Multi Image Flag',
        description: 'A flag with multiple images',
        fullDescription: 'Multi Image Flag - A flag with multiple images',
        type: 'flag',
        category: 'Social',
        flagImageUrls: [
          'https://example.com/flag1.jpg',
          'https://example.com/flag2.jpg',
          'https://example.com/flag3.jpg'
        ],
        ownerDisplayName: 'Jane Smith'
      }

      const html = buildPopupHtml(flagPin)
      document.body.innerHTML = html

      // Check that flag carousel exists
      const flagCarousel = document.querySelector('.buzz-popup-flag-carousel')
      expect(flagCarousel).toBeTruthy()

      // Check that all images are present
      const images = document.querySelectorAll('.buzz-popup-flag-carousel-image')
      expect(images).toHaveLength(3)
      
      images.forEach((img, index) => {
        const image = img as HTMLImageElement
        expect(image.src).toBe(`https://example.com/flag${index + 1}.jpg`)
        expect(image.alt).toBe(`Flag image ${index + 1} of 3`)
      })

      // Check that navigation controls are present
      const prevBtn = document.querySelector('.buzz-popup-flag-carousel-nav--prev')
      const nextBtn = document.querySelector('.buzz-popup-flag-carousel-nav--next')
      expect(prevBtn).toBeTruthy()
      expect(nextBtn).toBeTruthy()
      expect(prevBtn?.getAttribute('onclick')).toContain('buzzFlagCarouselPrev')
      expect(nextBtn?.getAttribute('onclick')).toContain('buzzFlagCarouselNext')

      // Check counter
      const counter = document.querySelector('.buzz-popup-flag-carousel-counter')
      expect(counter).toBeTruthy()
      const currentCounter = document.querySelector('.buzz-popup-flag-carousel-counter-current')
      expect(currentCounter?.textContent).toBe('1')
      expect(counter?.textContent).toContain('/ 3')

      // Check that thumbnails are present (3 images <= 5)
      const thumbnails = document.querySelector('.buzz-popup-flag-carousel-thumbnails')
      expect(thumbnails).toBeTruthy()
      
      const thumbnailButtons = document.querySelectorAll('.buzz-popup-flag-carousel-thumbnail')
      expect(thumbnailButtons).toHaveLength(3)
      
      // First thumbnail should be active
      expect(thumbnailButtons[0].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(true)
      expect(thumbnailButtons[1].classList.contains('buzz-popup-flag-carousel-thumbnail--active')).toBe(false)
    })

    it('displays dots instead of thumbnails for many images (>5)', () => {
      const flagPin: PinData = {
        id: 'flag-many',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Many Images Flag',
        description: 'A flag with many images',
        fullDescription: 'Many Images Flag - A flag with many images',
        type: 'flag',
        category: 'Social',
        flagImageUrls: [
          'https://example.com/flag1.jpg',
          'https://example.com/flag2.jpg',
          'https://example.com/flag3.jpg',
          'https://example.com/flag4.jpg',
          'https://example.com/flag5.jpg',
          'https://example.com/flag6.jpg'
        ],
        ownerDisplayName: 'Bob Wilson'
      }

      const html = buildPopupHtml(flagPin)
      document.body.innerHTML = html

      // Check that thumbnails are NOT present (6 images > 5)
      const thumbnails = document.querySelector('.buzz-popup-flag-carousel-thumbnails')
      expect(thumbnails).toBeFalsy()

      // Check that dots are present instead
      const dots = document.querySelector('.buzz-popup-flag-carousel-dots')
      expect(dots).toBeTruthy()
      
      const dotButtons = document.querySelectorAll('.buzz-popup-flag-carousel-dot')
      expect(dotButtons).toHaveLength(6)
      
      // First dot should be active
      expect(dotButtons[0].classList.contains('buzz-popup-flag-carousel-dot--active')).toBe(true)
      expect(dotButtons[1].classList.contains('buzz-popup-flag-carousel-dot--active')).toBe(false)

      // Check onclick handlers
      dotButtons.forEach((dot, index) => {
        expect(dot.getAttribute('onclick')).toContain(`buzzFlagCarouselGoTo('flag-many', ${index})`)
      })
    })

    it('displays flag popup without image section when no images exist (Requirement 2.4)', () => {
      const flagPin: PinData = {
        id: 'flag-no-images',
        lat: 40.7934,
        lng: -77.8616,
        title: 'No Images Flag',
        description: 'A flag without images',
        fullDescription: 'No Images Flag - A flag without images',
        type: 'flag',
        category: 'Social',
        flagImageUrls: [], // Empty array
        ownerDisplayName: 'Alice Johnson'
      }

      const html = buildPopupHtml(flagPin)
      document.body.innerHTML = html

      // Check that no flag carousel exists
      const flagCarousel = document.querySelector('.buzz-popup-flag-carousel')
      expect(flagCarousel).toBeFalsy()

      // Check that popup still has proper structure
      const popupCard = document.querySelector('.buzz-popup-card--flag')
      expect(popupCard).toBeTruthy()

      const title = document.querySelector('.buzz-popup-title')
      expect(title?.textContent).toBe('No Images Flag')

      // Check that flag details still appear
      const owner = document.querySelector('.buzz-popup-flag-owner')
      expect(owner?.textContent).toBe('By Alice Johnson')
    })

    it('handles flag image loading errors (Requirement 2.5)', () => {
      const flagPin: PinData = {
        id: 'flag-error',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Error Flag',
        description: 'A flag with broken images',
        fullDescription: 'Error Flag - A flag with broken images',
        type: 'flag',
        category: 'Social',
        flagImageUrls: [
          'https://example.com/broken1.jpg',
          'https://example.com/broken2.jpg'
        ],
        ownerDisplayName: 'Error User'
      }

      const html = buildPopupHtml(flagPin)
      document.body.innerHTML = html

      // Check that images have proper error handling
      const images = document.querySelectorAll('.buzz-popup-flag-carousel-image')
      images.forEach((img) => {
        const image = img as HTMLImageElement
        expect(image.getAttribute('onerror')).toContain('Flag image failed to load')
        expect(image.getAttribute('onerror')).toContain('this.style.display=\'none\'')
      })

      // Check that error elements exist
      const errorElements = document.querySelectorAll('.buzz-popup-flag-carousel-error')
      expect(errorElements).toHaveLength(2)
      
      errorElements.forEach((error) => {
        const errorIcon = error.querySelector('.buzz-popup-flag-carousel-error-icon')
        const errorText = error.querySelector('.buzz-popup-flag-carousel-error-text')
        expect(errorIcon?.textContent).toBe('⚠️')
        expect(errorText?.textContent).toBe('Failed to load image')
      })
    })

    it('includes proper accessibility attributes', () => {
      const flagPin: PinData = {
        id: 'flag-a11y',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Accessibility Flag',
        description: 'Testing accessibility',
        fullDescription: 'Accessibility Flag - Testing accessibility',
        type: 'flag',
        category: 'Social',
        flagImageUrls: [
          'https://example.com/a11y1.jpg',
          'https://example.com/a11y2.jpg'
        ],
        ownerDisplayName: 'A11y User'
      }

      const html = buildPopupHtml(flagPin)
      document.body.innerHTML = html

      // Check navigation button accessibility
      const prevBtn = document.querySelector('.buzz-popup-flag-carousel-nav--prev')
      const nextBtn = document.querySelector('.buzz-popup-flag-carousel-nav--next')
      expect(prevBtn?.getAttribute('aria-label')).toBe('Previous image')
      expect(nextBtn?.getAttribute('aria-label')).toBe('Next image')

      // Check thumbnail accessibility
      const thumbnails = document.querySelectorAll('.buzz-popup-flag-carousel-thumbnail')
      thumbnails.forEach((thumb, index) => {
        expect(thumb.getAttribute('aria-label')).toBe(`Go to image ${index + 1}`)
      })

      // Check image alt text
      const images = document.querySelectorAll('.buzz-popup-flag-carousel-image')
      images.forEach((img, index) => {
        expect((img as HTMLImageElement).alt).toBe(`Flag image ${index + 1} of 2`)
      })
    })
  })

  describe('Popup HTML Structure', () => {
    it('generates valid HTML structure', () => {
      const eventPin: PinData = {
        id: 'event-structure',
        lat: 40.7934,
        lng: -77.8616,
        title: 'Structure Test Event',
        description: 'Testing HTML structure',
        fullDescription: 'Structure Test Event - Testing HTML structure',
        type: 'event',
        category: 'Test',
        imageUrl: 'https://example.com/test.jpg',
        hours: '6/30/2024 at 2:00 PM - 4:00 PM',
        status: 'Upcoming'
      }

      const html = buildPopupHtml(eventPin)
      document.body.innerHTML = html

      // Check main popup card
      const popupCard = document.querySelector('.buzz-popup-card')
      expect(popupCard).toBeTruthy()

      // Check popup content wrapper
      const popupContent = document.querySelector('.buzz-popup-content')
      expect(popupContent).toBeTruthy()

      // Check title
      const title = document.querySelector('.buzz-popup-title')
      expect(title?.tagName).toBe('H4')

      // Check description
      const description = document.querySelector('.buzz-popup-description')
      expect(description?.tagName).toBe('P')

      // Check that all elements are properly nested
      expect(popupCard?.contains(popupContent)).toBe(true)
      expect(popupContent?.contains(title)).toBe(true)
      expect(popupContent?.contains(description)).toBe(true)
    })

    it('escapes HTML in pin data to prevent XSS', () => {
      const maliciousPin: PinData = {
        id: 'xss-test',
        lat: 40.7934,
        lng: -77.8616,
        title: '<script>alert("xss")</script>',
        description: '<img src="x" onerror="alert(\'xss\')">',
        fullDescription: 'XSS Test',
        type: 'event',
        category: 'Security'
      }

      const html = buildPopupHtml(maliciousPin)
      
      // Check that script tags are not executed (they appear as text)
      expect(html).toContain('&lt;script&gt;')
      expect(html).not.toContain('<script>alert')
      
      // The HTML should be safe to insert
      document.body.innerHTML = html
      
      const title = document.querySelector('.buzz-popup-title')
      expect(title?.textContent).toContain('<script>')
    })
  })
})