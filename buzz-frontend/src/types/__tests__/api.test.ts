import { describe, it, expect } from 'vitest'
import type {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  Flag,
  CreateFlagRequest,
  EventsResponse,
  FlagWithLikeCount
} from '../api'

describe('API Types - Image Management', () => {
  describe('Event Types', () => {
    it('should allow Event with imagePath field', () => {
      const event: Event = {
        id: '1',
        title: 'Test Event',
        category: 'music',
        startTime: '2024-01-01T10:00:00Z',
        expiresAt: '2024-01-01T22:00:00Z',
        owner: 'user1',
        lat: 40.7128,
        lon: -74.0060,
        description: 'Test event description',
        imagePath: 'https://example.com/event-banner.jpg'
      }

      expect(event.imagePath).toBe('https://example.com/event-banner.jpg')
    })

    it('should allow Event without imagePath field', () => {
      const event: Event = {
        id: '1',
        title: 'Test Event',
        category: 'music',
        startTime: '2024-01-01T10:00:00Z',
        expiresAt: '2024-01-01T22:00:00Z',
        owner: 'user1',
        lat: 40.7128,
        lon: -74.0060
      }

      expect(event.imagePath).toBeUndefined()
    })

    it('should validate CreateEventRequest with imagePath', () => {
      const request: CreateEventRequest = {
        title: 'New Event',
        category: 'sports',
        lat: 40.7128,
        lon: -74.0060,
        startTime: '2024-01-01T10:00:00Z',
        description: 'Event description',
        imagePath: 'https://example.com/banner.jpg'
      }

      expect(request.imagePath).toBe('https://example.com/banner.jpg')
    })

    it('should validate CreateEventRequest without imagePath', () => {
      const request: CreateEventRequest = {
        title: 'New Event',
        category: 'sports',
        lat: 40.7128,
        lon: -74.0060,
        startTime: '2024-01-01T10:00:00Z'
      }

      expect(request.imagePath).toBeUndefined()
    })

    it('should validate UpdateEventRequest with imagePath', () => {
      const request: UpdateEventRequest = {
        title: 'Updated Event',
        imagePath: 'https://example.com/new-banner.jpg'
      }

      expect(request.imagePath).toBe('https://example.com/new-banner.jpg')
    })

    it('should validate EventsResponse structure', () => {
      const response: EventsResponse = {
        events: [
          {
            id: '1',
            title: 'Event with Image',
            category: 'music',
            startTime: '2024-01-01T10:00:00Z',
            expiresAt: '2024-01-01T22:00:00Z',
            owner: 'user1',
            lat: 40.7128,
            lon: -74.0060,
            imagePath: 'https://example.com/banner.jpg'
          },
          {
            id: '2',
            title: 'Event without Image',
            category: 'sports',
            startTime: '2024-01-02T10:00:00Z',
            expiresAt: '2024-01-02T22:00:00Z',
            owner: 'user2',
            lat: 40.7589,
            lon: -73.9851
          }
        ],
        nextCursor: 'cursor123',
        hasMore: true
      }

      expect(response.events).toHaveLength(2)
      expect(response.events[0].imagePath).toBe('https://example.com/banner.jpg')
      expect(response.events[1].imagePath).toBeUndefined()
    })
  })

  describe('Flag Types', () => {
    it('should allow Flag with imagePaths array (preferred)', () => {
      const flag: Flag = {
        id: '1',
        userId: 'user1',
        title: 'Test Flag',
        lat: 40.7128,
        lon: -74.0060,
        category: 'social',
        imagePaths: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg'
        ],
        color: '#64B9D3',
        isPublic: true,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      }

      expect(flag.imagePaths).toHaveLength(3)
      expect(flag.imagePaths?.[0]).toBe('https://example.com/image1.jpg')
    })

    it('should allow Flag with legacy imageUrl field', () => {
      const flag: Flag = {
        id: '1',
        userId: 'user1',
        title: 'Legacy Flag',
        lat: 40.7128,
        lon: -74.0060,
        category: 'social',
        imageUrl: 'https://example.com/legacy-image.jpg',
        color: '#FF9B56',
        isPublic: true,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      }

      expect(flag.imageUrl).toBe('https://example.com/legacy-image.jpg')
      expect(flag.imagePaths).toBeUndefined()
    })

    it('should allow Flag with both imageUrl and imagePaths for backward compatibility', () => {
      const flag: Flag = {
        id: '1',
        userId: 'user1',
        title: 'Hybrid Flag',
        lat: 40.7128,
        lon: -74.0060,
        category: 'social',
        imageUrl: 'https://example.com/legacy.jpg',
        imagePaths: ['https://example.com/new1.jpg', 'https://example.com/new2.jpg'],
        color: '#F7CA1D',
        isPublic: true,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      }

      expect(flag.imageUrl).toBe('https://example.com/legacy.jpg')
      expect(flag.imagePaths).toHaveLength(2)
    })

    it('should allow Flag without any image fields', () => {
      const flag: Flag = {
        id: '1',
        userId: 'user1',
        title: 'Text Only Flag',
        lat: 40.7128,
        lon: -74.0060,
        category: 'social',
        color: '#FF5B59',
        isPublic: true,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      }

      expect(flag.imageUrl).toBeUndefined()
      expect(flag.imagePaths).toBeUndefined()
    })

    it('should validate CreateFlagRequest with imagePaths array', () => {
      const request: CreateFlagRequest = {
        title: 'New Flag',
        lat: 40.7128,
        lon: -74.0060,
        category: 'social',
        imagePaths: [
          'https://example.com/upload1.jpg',
          'https://example.com/upload2.jpg'
        ],
        color: '#64B9D3',
        isPublic: true
      }

      expect(request.imagePaths).toHaveLength(2)
      expect(request.imagePaths?.[0]).toBe('https://example.com/upload1.jpg')
    })

    it('should validate CreateFlagRequest with legacy imageUrl', () => {
      const request: CreateFlagRequest = {
        title: 'Legacy Flag Request',
        lat: 40.7128,
        lon: -74.0060,
        category: 'social',
        imageUrl: 'https://example.com/legacy-upload.jpg',
        isPublic: true
      }

      expect(request.imageUrl).toBe('https://example.com/legacy-upload.jpg')
      expect(request.imagePaths).toBeUndefined()
    })

    it('should validate CreateFlagRequest with null image fields', () => {
      const request: CreateFlagRequest = {
        title: 'No Image Flag',
        lat: 40.7128,
        lon: -74.0060,
        category: 'social',
        imageUrl: null,
        imagePaths: null,
        isPublic: true
      }

      expect(request.imageUrl).toBeNull()
      expect(request.imagePaths).toBeNull()
    })

    it('should validate FlagWithLikeCount structure', () => {
      const flagWithLikes: FlagWithLikeCount = {
        flag: {
          id: '1',
          userId: 'user1',
          title: 'Popular Flag',
          lat: 40.7128,
          lon: -74.0060,
          category: 'social',
          imagePaths: ['https://example.com/popular1.jpg', 'https://example.com/popular2.jpg'],
          color: '#64B9D3',
          isPublic: true,
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        },
        likeCount: 42,
        isLikedByCurrentUser: true
      }

      expect(flagWithLikes.flag.imagePaths).toHaveLength(2)
      expect(flagWithLikes.likeCount).toBe(42)
      expect(flagWithLikes.isLikedByCurrentUser).toBe(true)
    })
  })

  describe('Backward Compatibility', () => {
    it('should handle mixed legacy and new image fields in API responses', () => {
      // Simulate API response with mixed formats
      const flags: Flag[] = [
        {
          id: '1',
          userId: 'user1',
          title: 'Legacy Flag',
          lat: 40.7128,
          lon: -74.0060,
          category: 'social',
          imageUrl: 'https://example.com/legacy.jpg', // Legacy format
          isPublic: true,
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        },
        {
          id: '2',
          userId: 'user2',
          title: 'Modern Flag',
          lat: 40.7589,
          lon: -73.9851,
          category: 'social',
          imagePaths: ['https://example.com/new1.jpg', 'https://example.com/new2.jpg'], // New format
          isPublic: true,
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ]

      expect(flags[0].imageUrl).toBe('https://example.com/legacy.jpg')
      expect(flags[0].imagePaths).toBeUndefined()
      expect(flags[1].imageUrl).toBeUndefined()
      expect(flags[1].imagePaths).toHaveLength(2)
    })

    it('should allow empty arrays for imagePaths', () => {
      const flag: Flag = {
        id: '1',
        userId: 'user1',
        title: 'Empty Images Flag',
        lat: 40.7128,
        lon: -74.0060,
        category: 'social',
        imagePaths: [], // Empty array should be valid
        isPublic: true,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      }

      expect(flag.imagePaths).toHaveLength(0)
    })

    it('should validate maximum image limits in type structure', () => {
      // Test that TypeScript allows up to reasonable number of images
      const manyImages = Array.from({ length: 10 }, (_, i) => `https://example.com/image${i + 1}.jpg`)
      
      const flag: Flag = {
        id: '1',
        userId: 'user1',
        title: 'Many Images Flag',
        lat: 40.7128,
        lon: -74.0060,
        category: 'social',
        imagePaths: manyImages,
        isPublic: true,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      }

      expect(flag.imagePaths).toHaveLength(10)
    })
  })

  describe('Type Safety', () => {
    it('should enforce string array type for imagePaths', () => {
      const validImagePaths: string[] = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.png',
        'https://example.com/image3.webp'
      ]

      const flag: Flag = {
        id: '1',
        userId: 'user1',
        title: 'Type Safe Flag',
        lat: 40.7128,
        lon: -74.0060,
        category: 'social',
        imagePaths: validImagePaths,
        isPublic: true,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      }

      expect(Array.isArray(flag.imagePaths)).toBe(true)
      expect(typeof flag.imagePaths?.[0]).toBe('string')
    })

    it('should enforce optional string type for imagePath in events', () => {
      const eventWithImage: Event = {
        id: '1',
        title: 'Event with Image',
        category: 'music',
        startTime: '2024-01-01T10:00:00Z',
        expiresAt: '2024-01-01T22:00:00Z',
        owner: 'user1',
        lat: 40.7128,
        lon: -74.0060,
        imagePath: 'https://example.com/banner.jpg'
      }

      const eventWithoutImage: Event = {
        id: '2',
        title: 'Event without Image',
        category: 'sports',
        startTime: '2024-01-02T10:00:00Z',
        expiresAt: '2024-01-02T22:00:00Z',
        owner: 'user2',
        lat: 40.7589,
        lon: -73.9851
      }

      expect(typeof eventWithImage.imagePath).toBe('string')
      expect(eventWithoutImage.imagePath).toBeUndefined()
    })
  })
})