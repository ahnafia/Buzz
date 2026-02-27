import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from '../api'
import type { EventsResponse } from '../../types/api'

// Mock fetch
global.fetch = vi.fn()

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: vi.fn(),
  error: vi.fn()
}
vi.stubGlobal('console', mockConsole)

describe('API Search Events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.VITE_API_URL = 'http://localhost:8080'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('searchEvents', () => {
    const mockSearchResponse: EventsResponse = {
      events: [
        {
          id: 'event-1',
          title: 'Music Concert',
          category: 'MUSIC',
          startTime: '2024-03-15T20:00:00Z',
          expiresAt: '2024-03-15T23:00:00Z',
          owner: 'user-1',
          lat: 40.7128,
          lon: -74.0060,
          description: 'Live music performance'
        },
        {
          id: 'event-2',
          title: 'Art Exhibition',
          category: 'ART',
          startTime: '2024-03-16T10:00:00Z',
          expiresAt: '2024-03-16T18:00:00Z',
          owner: 'user-2',
          lat: 40.7589,
          lon: -73.9851,
          description: 'Contemporary art showcase'
        }
      ],
      nextCursor: 'cursor-123',
      hasMore: true
    }

    it('should successfully search events with all parameters', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      })

      const result = await api.searchEvents('music concert', 40.7128, -74.0060, 10.0, 25)

      expect(result).toEqual(mockSearchResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/search/events?query=music+concert&lat=40.7128&lon=-74.006&radiusMiles=10&limit=25',
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    })

    it('should use default parameters when not provided', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      })

      const result = await api.searchEvents('art exhibition', 40.7589, -73.9851)

      expect(result).toEqual(mockSearchResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/search/events?query=art+exhibition&lat=40.7589&lon=-73.9851&radiusMiles=5&limit=20',
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    })

    it('should trim whitespace from query', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      })

      await api.searchEvents('  music concert  ', 40.7128, -74.0060)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('query=music+concert'),
        expect.any(Object)
      )
    })

    it('should handle empty search results', async () => {
      const emptyResponse: EventsResponse = {
        events: [],
        hasMore: false
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptyResponse)
      })

      const result = await api.searchEvents('nonexistent event', 40.7128, -74.0060)

      expect(result).toEqual(emptyResponse)
    })

    it('should throw error for empty query', async () => {
      await expect(api.searchEvents('', 40.7128, -74.0060)).rejects.toThrow('Search query is required')
      await expect(api.searchEvents('   ', 40.7128, -74.0060)).rejects.toThrow('Search query is required')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should throw error for invalid coordinates', async () => {
      // Mock fetch to avoid actual calls for validation errors
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      })

      await expect(api.searchEvents('test', NaN, -74.0060)).rejects.toThrow('Valid latitude and longitude are required')
      await expect(api.searchEvents('test', 40.7128, NaN)).rejects.toThrow('Valid latitude and longitude are required')
      await expect(api.searchEvents('test', 'invalid' as any, -74.0060)).rejects.toThrow('Valid latitude and longitude are required')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle 400 Bad Request error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid search parameters')
      })

      await expect(api.searchEvents('test', 40.7128, -74.0060)).rejects.toThrow('Invalid search parameters')
    })

    it('should handle 429 Rate Limit error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded')
      })

      await expect(api.searchEvents('test', 40.7128, -74.0060)).rejects.toThrow('Too many requests. Please try again later.')
    })

    it('should handle 500 Server Error', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error')
      })

      await expect(api.searchEvents('test', 40.7128, -74.0060)).rejects.toThrow('Search service temporarily unavailable')
    })

    it('should handle other HTTP errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found')
      })

      await expect(api.searchEvents('test', 40.7128, -74.0060)).rejects.toThrow('Search failed: 404')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(api.searchEvents('test', 40.7128, -74.0060)).rejects.toThrow('Network error. Please check your connection.')
    })

    it('should handle JSON parsing errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      await expect(api.searchEvents('test', 40.7128, -74.0060)).rejects.toThrow('Invalid JSON')
    })

    it('should log search parameters and results', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      })

      await api.searchEvents('music concert', 40.7128, -74.0060, 10.0, 25)

      expect(mockConsole.log).toHaveBeenCalledWith('🔍 Searching events with params:', {
        query: 'music concert',
        lat: 40.7128,
        lon: -74.0060,
        radiusMiles: 10.0,
        limit: 25
      })
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Search events successful:', mockSearchResponse)
    })

    it('should log errors appropriately', async () => {
      const errorResponse = 'Invalid parameters'
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(errorResponse)
      })

      await expect(api.searchEvents('test', 40.7128, -74.0060)).rejects.toThrow()

      expect(mockConsole.error).toHaveBeenCalledWith('❌ Search events error response:', errorResponse)
      expect(mockConsole.error).toHaveBeenCalledWith('❌ Error searching events:', expect.any(Error))
    })

    it('should handle special characters in query', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      })

      await api.searchEvents('café & music!', 40.7128, -74.0060)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('query=caf%C3%A9+%26+music%21'),
        expect.any(Object)
      )
    })

    it('should handle boundary coordinate values', async () => {
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      })

      // Test extreme but valid coordinates
      await api.searchEvents('test', 90, 180) // North pole, international date line
      await api.searchEvents('test', -90, -180) // South pole, opposite side

      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle large radius values', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      })

      await api.searchEvents('test', 40.7128, -74.0060, 1000.0, 100)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('radiusMiles=1000&limit=100'),
        expect.any(Object)
      )
    })
  })
})