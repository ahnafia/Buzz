import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ImageManager, getResponsiveImageUrls, preloadImages, DEFAULT_IMAGE_CONFIG } from '../imageOptimization'

// Mock storage functions
vi.mock('../storage', () => ({
  uploadEventImage: vi.fn(),
  uploadFlagImages: vi.fn(),
  cleanupOrphanedImages: vi.fn(),
  batchDeleteImages: vi.fn(),
  getOptimizedImageUrl: vi.fn((url, options) => {
    const params = new URLSearchParams()
    if (options?.width) params.set('width', options.width.toString())
    if (options?.height) params.set('height', options.height.toString())
    if (options?.quality) params.set('quality', options.quality.toString())
    return `${url}?${params.toString()}`
  }),
  filterValidImageUrls: vi.fn()
}))

describe('Image Optimization Utilities', () => {
  let imageManager: ImageManager

  beforeEach(() => {
    vi.clearAllMocks()
    imageManager = new ImageManager()
  })

  afterEach(() => {
    imageManager.destroy()
  })

  describe('ImageManager', () => {
    it('should initialize with default config', () => {
      const config = imageManager.getConfig()
      expect(config).toEqual(DEFAULT_IMAGE_CONFIG)
    })

    it('should initialize with custom config', () => {
      const customConfig = { maxWidth: 1024, quality: 0.9 }
      const manager = new ImageManager(customConfig)
      
      const config = manager.getConfig()
      expect(config.maxWidth).toBe(1024)
      expect(config.quality).toBe(0.9)
      expect(config.maxHeight).toBe(DEFAULT_IMAGE_CONFIG.maxHeight) // Should keep default
      
      manager.destroy()
    })

    it('should upload event banner successfully', async () => {
      const { uploadEventImage } = await import('../storage')
      vi.mocked(uploadEventImage).mockResolvedValue('https://example.com/banner.jpg')

      const mockFile = new File(['test'], 'banner.jpg', { type: 'image/jpeg' })
      const result = await imageManager.uploadEventBanner(mockFile)

      expect(result).toBe('https://example.com/banner.jpg')
      expect(uploadEventImage).toHaveBeenCalledWith(mockFile)
    })

    it('should upload flag gallery successfully', async () => {
      const { uploadFlagImages } = await import('../storage')
      const mockUrls = ['https://example.com/flag1.jpg', 'https://example.com/flag2.jpg']
      vi.mocked(uploadFlagImages).mockResolvedValue(mockUrls)

      const mockFiles = [
        new File(['test1'], 'flag1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'flag2.jpg', { type: 'image/jpeg' })
      ]
      const result = await imageManager.uploadFlagGallery(mockFiles)

      expect(result).toEqual(mockUrls)
      expect(uploadFlagImages).toHaveBeenCalledWith(mockFiles)
    })

    it('should get optimized URLs', () => {
      const urls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      const options = { width: 800, height: 600 }

      const result = imageManager.getOptimizedUrls(urls, options)

      expect(result).toEqual([
        'https://example.com/image1.jpg?width=800&height=600',
        'https://example.com/image2.jpg?width=800&height=600'
      ])
    })

    it('should perform cleanup successfully', async () => {
      const { cleanupOrphanedImages } = await import('../storage')
      const mockResult = { deleted: ['orphan1.jpg'], errors: [] }
      vi.mocked(cleanupOrphanedImages).mockResolvedValue(mockResult)

      const referencedUrls = ['keep.jpg']
      const result = await imageManager.performCleanup(referencedUrls)

      expect(result).toEqual(mockResult)
      expect(cleanupOrphanedImages).toHaveBeenCalledWith(referencedUrls, 'media', false)
    })

    it('should perform dry run cleanup', async () => {
      const { cleanupOrphanedImages } = await import('../storage')
      const mockResult = { deleted: ['orphan1.jpg'], errors: [] }
      vi.mocked(cleanupOrphanedImages).mockResolvedValue(mockResult)

      const referencedUrls = ['keep.jpg']
      const result = await imageManager.performCleanup(referencedUrls, true)

      expect(result).toEqual(mockResult)
      expect(cleanupOrphanedImages).toHaveBeenCalledWith(referencedUrls, 'media', true)
    })

    it('should validate image URLs', async () => {
      const { filterValidImageUrls } = await import('../storage')
      const inputUrls = ['valid.jpg', 'invalid.txt', 'another.jpg']
      const validUrls = ['valid.jpg', 'another.jpg']
      vi.mocked(filterValidImageUrls).mockResolvedValue(validUrls)

      const result = await imageManager.validateImageUrls(inputUrls)

      expect(result).toEqual(validUrls)
      expect(filterValidImageUrls).toHaveBeenCalledWith(inputUrls)
    })

    it('should delete images in batch', async () => {
      const { batchDeleteImages } = await import('../storage')
      const mockResult = { success: ['image1.jpg'], failed: ['image2.jpg'] }
      vi.mocked(batchDeleteImages).mockResolvedValue(mockResult)

      const urls = ['image1.jpg', 'image2.jpg']
      const result = await imageManager.deleteImages(urls)

      expect(result).toEqual(mockResult)
      expect(batchDeleteImages).toHaveBeenCalledWith(urls)
    })

    it('should update configuration', () => {
      const newConfig = { maxWidth: 1024, quality: 0.9 }
      imageManager.updateConfig(newConfig)

      const config = imageManager.getConfig()
      expect(config.maxWidth).toBe(1024)
      expect(config.quality).toBe(0.9)
    })

    it('should handle upload errors gracefully', async () => {
      const { uploadEventImage } = await import('../storage')
      vi.mocked(uploadEventImage).mockRejectedValue(new Error('Upload failed'))

      const mockFile = new File(['test'], 'banner.jpg', { type: 'image/jpeg' })
      
      await expect(imageManager.uploadEventBanner(mockFile)).rejects.toThrow('Upload failed')
    })
  })

  describe('getResponsiveImageUrls', () => {
    it('should generate responsive image URLs', () => {
      const url = 'https://example.com/image.jpg'
      const result = getResponsiveImageUrls(url)

      expect(result.thumbnail).toContain('width=150&height=150')
      expect(result.small).toContain('width=400&height=400')
      expect(result.medium).toContain('width=800&height=800')
      expect(result.large).toContain('width=1200&height=1200')
      expect(result.original).toBe(url)
    })
  })

  describe('preloadImages', () => {
    it('should preload images successfully', async () => {
      const urls = ['image1.jpg', 'image2.jpg']
      
      // Mock Image constructor with proper function
      const mockImages: any[] = []
      global.Image = function() {
        const img = {
          onload: null as any,
          onerror: null as any,
          src: '',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }
        
        // Simulate successful load when src is set
        Object.defineProperty(img, 'src', {
          set: function(value) {
            setTimeout(() => {
              if (this.onload) this.onload()
            }, 0)
          }
        })
        
        mockImages.push(img)
        return img
      } as any

      await expect(preloadImages(urls)).resolves.toBeDefined()
      expect(mockImages).toHaveLength(2)
    })

    it('should handle preload errors', async () => {
      const urls = ['invalid-image.jpg']
      
      // Mock Image constructor with error
      global.Image = function() {
        const img = {
          onload: null as any,
          onerror: null as any,
          src: '',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }
        
        // Simulate failed load when src is set
        Object.defineProperty(img, 'src', {
          set: function(value) {
            setTimeout(() => {
              if (this.onerror) this.onerror()
            }, 0)
          }
        })
        
        return img
      } as any

      await expect(preloadImages(urls)).rejects.toThrow('Failed to preload image')
    })
  })
})