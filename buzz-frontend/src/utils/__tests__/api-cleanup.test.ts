import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from '../api'

// Mock storage functions
const mockDeleteImages = vi.fn()
vi.mock('../storage', () => ({
  deleteImages: mockDeleteImages
}))

// Mock fetch
global.fetch = vi.fn()

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'test-user-id'),
  setItem: vi.fn(),
  removeItem: vi.fn()
}
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage
})

describe('API Cleanup Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.VITE_API_URL = 'http://localhost:8080'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('deleteEvent', () => {
    it('should delete event and cleanup associated image', async () => {
      const eventId = 'test-event-id'
      const mockEvent = {
        id: eventId,
        title: 'Test Event',
        imagePath: 'https://example.com/storage/media/events/test.jpg'
      }

      // Mock getEvent response
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEvent)
        })
        // Mock delete response
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('')
        })

      mockDeleteImages.mockResolvedValue(undefined)

      const result = await api.deleteEvent(eventId)

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
      
      // Check getEvent call
      expect(global.fetch).toHaveBeenNthCalledWith(1, `http://localhost:8080/events/${eventId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Check delete call
      expect(global.fetch).toHaveBeenNthCalledWith(2, `http://localhost:8080/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': 'test-user-id',
          'Content-Type': 'application/json'
        }
      })

      // Check image cleanup
      expect(mockDeleteImages).toHaveBeenCalledWith([mockEvent.imagePath])
    })

    it('should delete event without image cleanup when no image exists', async () => {
      const eventId = 'test-event-id'
      const mockEvent = {
        id: eventId,
        title: 'Test Event',
        imagePath: null
      }

      // Mock getEvent response
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEvent)
        })
        // Mock delete response
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('')
        })

      const result = await api.deleteEvent(eventId)

      expect(result).toBe(true)
      expect(mockDeleteImages).not.toHaveBeenCalled()
    })

    it('should continue deletion even if image cleanup fails', async () => {
      const eventId = 'test-event-id'
      const mockEvent = {
        id: eventId,
        title: 'Test Event',
        imagePath: 'https://example.com/storage/media/events/test.jpg'
      }

      // Mock getEvent response
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEvent)
        })
        // Mock delete response
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('')
        })

      // Mock image cleanup failure
      mockDeleteImages.mockRejectedValue(new Error('Storage error'))

      const result = await api.deleteEvent(eventId)

      expect(result).toBe(true) // Should still succeed
      expect(mockDeleteImages).toHaveBeenCalledWith([mockEvent.imagePath])
    })

    it('should handle delete API errors', async () => {
      const eventId = 'test-event-id'

      // Mock getEvent response
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: eventId })
        })
        // Mock delete error response
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Event not found')
        })

      await expect(api.deleteEvent(eventId)).rejects.toThrow('HTTP error! status: 404, body: Event not found')
      expect(mockDeleteImages).not.toHaveBeenCalled()
    })
  })

  describe('deleteFlag', () => {
    it('should delete flag and cleanup associated images (imagePaths)', async () => {
      const flagId = 'test-flag-id'
      const mockFlag = {
        id: flagId,
        title: 'Test Flag',
        imagePaths: [
          'https://example.com/storage/media/flags/test1.jpg',
          'https://example.com/storage/media/flags/test2.jpg'
        ]
      }

      // Mock getFlag response
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFlag)
        })
        // Mock delete response
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('')
        })

      mockDeleteImages.mockResolvedValue(undefined)

      const result = await api.deleteFlag(flagId)

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
      
      // Check delete call
      expect(global.fetch).toHaveBeenNthCalledWith(2, `http://localhost:8080/flags/${flagId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': 'test-user-id',
          'Content-Type': 'application/json'
        }
      })

      // Check image cleanup
      expect(mockDeleteImages).toHaveBeenCalledWith(mockFlag.imagePaths)
    })

    it('should delete flag and cleanup legacy imageUrl', async () => {
      const flagId = 'test-flag-id'
      const mockFlag = {
        id: flagId,
        title: 'Test Flag',
        imageUrl: 'https://example.com/storage/media/flags/legacy.jpg'
      }

      // Mock getFlag response
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFlag)
        })
        // Mock delete response
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('')
        })

      mockDeleteImages.mockResolvedValue(undefined)

      const result = await api.deleteFlag(flagId)

      expect(result).toBe(true)
      expect(mockDeleteImages).toHaveBeenCalledWith([mockFlag.imageUrl])
    })

    it('should handle both imageUrl and imagePaths', async () => {
      const flagId = 'test-flag-id'
      const mockFlag = {
        id: flagId,
        title: 'Test Flag',
        imageUrl: 'https://example.com/storage/media/flags/legacy.jpg',
        imagePaths: [
          'https://example.com/storage/media/flags/new1.jpg',
          'https://example.com/storage/media/flags/new2.jpg'
        ]
      }

      // Mock getFlag response
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFlag)
        })
        // Mock delete response
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('')
        })

      mockDeleteImages.mockResolvedValue(undefined)

      const result = await api.deleteFlag(flagId)

      expect(result).toBe(true)
      expect(mockDeleteImages).toHaveBeenCalledWith([
        mockFlag.imageUrl,
        ...mockFlag.imagePaths
      ])
    })

    it('should continue deletion when flag fetch fails', async () => {
      const flagId = 'test-flag-id'

      // Mock getFlag error (404 or other error)
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        // Mock delete response
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('')
        })

      const result = await api.deleteFlag(flagId)

      expect(result).toBe(true)
      expect(mockDeleteImages).not.toHaveBeenCalled()
    })

    it('should handle delete API errors', async () => {
      const flagId = 'test-flag-id'

      // Mock getFlag response
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: flagId })
        })
        // Mock delete error response
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: () => Promise.resolve('Forbidden')
        })

      await expect(api.deleteFlag(flagId)).rejects.toThrow('HTTP error! status: 403, body: Forbidden')
      expect(mockDeleteImages).not.toHaveBeenCalled()
    })

    it('should handle missing user ID', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await expect(api.deleteFlag('test-flag-id')).rejects.toThrow('No user ID available')
      expect(global.fetch).not.toHaveBeenCalled()
      expect(mockDeleteImages).not.toHaveBeenCalled()
    })
  })
})