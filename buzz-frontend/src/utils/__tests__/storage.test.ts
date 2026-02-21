import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch for URL validation tests
global.fetch = vi.fn()

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
        getPublicUrl: vi.fn()
      }))
    }
  }
}))

import {
  extractFilePathFromUrl,
  validateImageUrl,
  filterValidImageUrls,
  getOptimizedImageUrl,
  batchDeleteImages,
  cleanupOrphanedImages
} from '../storage'

describe('Storage Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('extractFilePathFromUrl', () => {
    it('should extract file path from valid Supabase URL', () => {
      const url = 'https://example.supabase.co/storage/v1/object/public/Media/flags/123_abc.jpg'
      const result = extractFilePathFromUrl(url, 'Media')
      expect(result).toBe('flags/123_abc.jpg')
    })

    it('should throw error for invalid URL format', () => {
      const url = 'https://example.com/invalid/url.jpg'
      expect(() => extractFilePathFromUrl(url, 'Media')).toThrow('Invalid URL format')
    })

    it('should handle different bucket names', () => {
      const url = 'https://example.supabase.co/storage/v1/object/public/images/events/456_def.png'
      const result = extractFilePathFromUrl(url, 'images')
      expect(result).toBe('events/456_def.png')
    })
  })

  describe('validateImageUrl', () => {
    it('should return true for valid image URL', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('image/jpeg')
        }
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await validateImageUrl('https://example.com/image.jpg')
      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.jpg', { method: 'HEAD' })
    })

    it('should return false for non-image content type', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('text/html')
        }
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await validateImageUrl('https://example.com/page.html')
      expect(result).toBe(false)
    })

    it('should return false for failed request', async () => {
      const mockResponse = {
        ok: false,
        headers: {
          get: vi.fn().mockReturnValue('image/jpeg')
        }
      }
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await validateImageUrl('https://example.com/notfound.jpg')
      expect(result).toBe(false)
    })

    it('should return false for network error', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await validateImageUrl('https://example.com/image.jpg')
      expect(result).toBe(false)
    })
  })

  describe('filterValidImageUrls', () => {
    it('should filter out invalid URLs', async () => {
      const urls = [
        'https://example.com/valid1.jpg',
        'https://example.com/invalid.html',
        'https://example.com/valid2.png'
      ]

      // Mock responses for each URL
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: vi.fn().mockReturnValue('image/jpeg') }
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: vi.fn().mockReturnValue('text/html') }
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: vi.fn().mockReturnValue('image/png') }
        })

      const result = await filterValidImageUrls(urls)
      expect(result).toEqual([
        'https://example.com/valid1.jpg',
        'https://example.com/valid2.png'
      ])
    })

    it('should return empty array for empty input', async () => {
      const result = await filterValidImageUrls([])
      expect(result).toEqual([])
    })
  })

  describe('getOptimizedImageUrl', () => {
    it('should add optimization parameters to URL', () => {
      const url = 'https://example.com/image.jpg'
      const options = {
        width: 800,
        height: 600,
        quality: 80,
        format: 'webp' as const
      }

      const result = getOptimizedImageUrl(url, options)
      const resultUrl = new URL(result)

      expect(resultUrl.searchParams.get('width')).toBe('800')
      expect(resultUrl.searchParams.get('height')).toBe('600')
      expect(resultUrl.searchParams.get('quality')).toBe('80')
      expect(resultUrl.searchParams.get('format')).toBe('webp')
      expect(resultUrl.searchParams.get('cache')).toBe('3600')
    })

    it('should return original URL if optimization fails', () => {
      const invalidUrl = 'not-a-valid-url'
      const result = getOptimizedImageUrl(invalidUrl)
      expect(result).toBe(invalidUrl)
    })

    it('should handle URLs without options', () => {
      const url = 'https://example.com/image.jpg'
      const result = getOptimizedImageUrl(url)
      const resultUrl = new URL(result)

      expect(resultUrl.searchParams.get('cache')).toBe('3600')
      expect(resultUrl.searchParams.has('width')).toBe(false)
    })
  })

  describe('batchDeleteImages', () => {
    it('should successfully delete all images', async () => {
      const urls = [
        'https://example.supabase.co/storage/v1/object/public/Media/flags/image1.jpg',
        'https://example.supabase.co/storage/v1/object/public/Media/flags/image2.jpg'
      ]
      
      // Mock the supabase module
      const { supabase } = await import('../../lib/supabase')
      const mockStorage = supabase.storage.from()
      vi.mocked(mockStorage.remove).mockResolvedValue({ error: null })

      const result = await batchDeleteImages(urls)
      
      expect(result.success).toEqual(urls)
      expect(result.failed).toEqual([])
      expect(mockStorage.remove).toHaveBeenCalledTimes(2)
    })

    it('should handle failed deletions with retries', async () => {
      const urls = ['https://example.supabase.co/storage/v1/object/public/Media/flags/image1.jpg']
      
      // Mock the supabase module
      const { supabase } = await import('../../lib/supabase')
      const mockStorage = supabase.storage.from()
      vi.mocked(mockStorage.remove).mockRejectedValue(new Error('Delete failed'))

      const result = await batchDeleteImages(urls, 'Media', 1) // Only 1 retry
      
      expect(result.success).toEqual([])
      expect(result.failed).toEqual(urls)
      expect(mockStorage.remove).toHaveBeenCalledTimes(1) // 1 attempt, no retries due to limit
    })

    it('should return empty results for empty input', async () => {
      const result = await batchDeleteImages([])
      expect(result.success).toEqual([])
      expect(result.failed).toEqual([])
    })
  })

  describe('cleanupOrphanedImages', () => {
    it('should identify and delete orphaned images', async () => {
      const referencedUrls = ['https://example.supabase.co/storage/v1/object/public/Media/flags/keep.jpg']
      
      // Mock the supabase module
      const { supabase } = await import('../../lib/supabase')
      const mockStorage = supabase.storage.from()
      vi.mocked(mockStorage.list).mockResolvedValue({
        data: [
          { name: 'flags/keep.jpg' },
          { name: 'flags/orphan.jpg' }
        ],
        error: null
      })

      // Mock getPublicUrl responses
      vi.mocked(mockStorage.getPublicUrl)
        .mockReturnValueOnce({ data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/Media/flags/keep.jpg' } })
        .mockReturnValueOnce({ data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/Media/flags/orphan.jpg' } })

      // Mock successful deletion
      vi.mocked(mockStorage.remove).mockResolvedValue({ error: null })

      const result = await cleanupOrphanedImages(referencedUrls)
      
      expect(result.deleted).toEqual(['https://example.supabase.co/storage/v1/object/public/Media/flags/orphan.jpg'])
      expect(result.errors).toEqual([])
    })

    it('should handle dry run mode', async () => {
      const referencedUrls = ['https://example.supabase.co/storage/v1/object/public/Media/flags/keep.jpg']
      
      // Mock the supabase module
      const { supabase } = await import('../../lib/supabase')
      const mockStorage = supabase.storage.from()
      vi.mocked(mockStorage.list).mockResolvedValue({
        data: [
          { name: 'flags/keep.jpg' },
          { name: 'flags/orphan.jpg' }
        ],
        error: null
      })

      // Mock getPublicUrl responses
      vi.mocked(mockStorage.getPublicUrl)
        .mockReturnValueOnce({ data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/Media/flags/keep.jpg' } })
        .mockReturnValueOnce({ data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/Media/flags/orphan.jpg' } })

      const result = await cleanupOrphanedImages(referencedUrls, 'Media', true)
      
      expect(result.deleted).toEqual(['https://example.supabase.co/storage/v1/object/public/Media/flags/orphan.jpg'])
      expect(mockStorage.remove).not.toHaveBeenCalled()
    })

    it('should handle storage list errors', async () => {
      const { supabase } = await import('../../lib/supabase')
      const mockStorage = supabase.storage.from()
      vi.mocked(mockStorage.list).mockResolvedValue({
        data: null,
        error: { message: 'Access denied' }
      })

      const result = await cleanupOrphanedImages([])
      
      expect(result.deleted).toEqual([])
      expect(result.errors).toEqual(['Failed to list files: Access denied'])
    })
  })
})