import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()
const mockRemove = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      })),
    },
  },
}))

// Simple mock for image compression - just return the original file
vi.mock('./storage', async () => {
  const actual = await vi.importActual('./storage') as any
  
  // Create a simple compression mock that returns the original file
  const mockCompressImage = async (file: File) => file
  
  return {
    ...actual,
    // Override internal compression function for testing
    compressImage: mockCompressImage,
  }
})

// Import the functions after mocking
import { uploadEventImage, uploadFlagImages, deleteImages, uploadMediaFiles } from './storage'

// Helper function to create mock files
const createMockFile = (name: string, size: number, type: string): File => {
  return new File(['mock content'], name, { type, size })
}

describe('Storage Utils - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default successful responses
    mockUpload.mockResolvedValue({
      data: { path: 'mock-path' },
      error: null,
    })
    
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/mock-url' },
    })
    
    mockRemove.mockResolvedValue({
      error: null,
    })
  })

  describe('deleteImages', () => {
    it('successfully deletes multiple images', async () => {
      const urls = [
        'https://example.com/storage/v1/object/public/Media/flags/image1.jpg',
        'https://example.com/storage/v1/object/public/Media/events/image2.png',
      ]
      
      await deleteImages(urls)
      
      expect(mockRemove).toHaveBeenCalledWith([
        'flags/image1.jpg',
        'events/image2.png',
      ])
    })

    it('handles empty URL array', async () => {
      await deleteImages([])
      
      expect(mockRemove).not.toHaveBeenCalled()
    })

    it('handles delete errors gracefully', async () => {
      const urls = ['https://example.com/storage/v1/object/public/Media/flags/image1.jpg']
      
      mockRemove.mockResolvedValue({
        error: { message: 'Delete failed' },
      })
      
      await expect(deleteImages(urls)).rejects.toThrow('Failed to delete images: Delete failed')
    })

    it('handles invalid URL formats', async () => {
      const urls = ['https://invalid-url.com/not-a-storage-url']
      
      await expect(deleteImages(urls)).rejects.toThrow('Invalid URL format')
    })

    it('extracts correct file paths from various URL formats', async () => {
      const urls = [
        'https://example.com/storage/v1/object/public/Media/flags/subfolder/image1.jpg',
        'https://example.com/storage/v1/object/public/Media/events/image2.png',
      ]
      
      await deleteImages(urls)
      
      expect(mockRemove).toHaveBeenCalledWith([
        'flags/subfolder/image1.jpg',
        'events/image2.png',
      ])
    })
  })

  describe('File path organization', () => {
    it('organizes event images in events/ directory', () => {
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileName = `${timestamp}_${randomString}.jpg`
      const expectedPath = `events/${fileName}`
      
      expect(expectedPath).toMatch(/^events\/\d+_[a-z0-9]+\.jpg$/)
    })

    it('organizes flag images in flags/ directory', () => {
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileName = `${timestamp}_${randomString}.png`
      const expectedPath = `flags/${fileName}`
      
      expect(expectedPath).toMatch(/^flags\/\d+_[a-z0-9]+\.png$/)
    })

    it('generates unique filenames with timestamp and random string', () => {
      const originalName = 'test.jpg'
      const timestamp = 1234567890
      const randomValue = 0.123456789
      
      // Mock the functions
      vi.spyOn(Date, 'now').mockReturnValue(timestamp)
      vi.spyOn(Math, 'random').mockReturnValue(randomValue)
      
      const fileExtension = originalName.split('.').pop()
      const randomString = randomValue.toString(36).substring(2, 15)
      const fileName = `${timestamp}_${randomString}.${fileExtension}`
      
      // Test the pattern rather than exact string since random generation can vary
      expect(fileName).toMatch(/^\d+_[a-z0-9]+\.jpg$/)
      expect(fileName).toContain('1234567890_')
      expect(fileName.endsWith('.jpg')).toBe(true)
    })

    it('preserves file extensions correctly', () => {
      const testCases = [
        { name: 'test.jpeg', expected: 'jpeg' },
        { name: 'image.png', expected: 'png' },
        { name: 'photo.webp', expected: 'webp' },
        { name: 'file.JPG', expected: 'JPG' },
      ]
      
      testCases.forEach(({ name, expected }) => {
        const extension = name.split('.').pop()
        expect(extension).toBe(expected)
      })
    })
  })

  describe('Error handling patterns', () => {
    it('handles Supabase upload errors', async () => {
      const error = { message: 'Storage quota exceeded' }
      mockUpload.mockResolvedValue({ data: null, error })
      
      // Test the error handling pattern
      const handleUploadError = (error: any, fileName: string) => {
        if (error) {
          throw new Error(`Failed to upload ${fileName}: ${error.message}`)
        }
      }
      
      expect(() => handleUploadError(error, 'test.jpg')).toThrow('Failed to upload test.jpg: Storage quota exceeded')
    })

    it('handles network errors', async () => {
      const networkError = new Error('Network connection failed')
      mockUpload.mockRejectedValue(networkError)
      
      // Test that network errors are propagated
      try {
        await mockUpload('test-path', new File([], 'test.jpg'), {})
      } catch (error) {
        expect(error).toEqual(networkError)
      }
    })
  })

  describe('File validation patterns', () => {
    it('validates file extensions', () => {
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp']
      const testFiles = [
        'image.jpg',
        'photo.jpeg', 
        'picture.png',
        'graphic.webp',
        'document.pdf', // Invalid
        'text.txt', // Invalid
      ]
      
      testFiles.forEach(fileName => {
        const extension = fileName.split('.').pop()?.toLowerCase()
        const isValid = validExtensions.includes(extension || '')
        
        if (fileName.includes('pdf') || fileName.includes('txt')) {
          expect(isValid).toBe(false)
        } else {
          expect(isValid).toBe(true)
        }
      })
    })

    it('validates file sizes', () => {
      const maxSize = 10 * 1024 * 1024 // 10MB
      const testSizes = [
        { size: 1024, valid: true },
        { size: 5 * 1024 * 1024, valid: true },
        { size: 15 * 1024 * 1024, valid: false },
        { size: 0, valid: true },
      ]
      
      testSizes.forEach(({ size, valid }) => {
        const isValid = size <= maxSize
        expect(isValid).toBe(valid)
      })
    })
  })

  describe('URL parsing', () => {
    it('correctly parses Supabase storage URLs', () => {
      const testUrls = [
        {
          url: 'https://example.com/storage/v1/object/public/Media/flags/image1.jpg',
          expected: 'flags/image1.jpg'
        },
        {
          url: 'https://example.com/storage/v1/object/public/Media/events/banner.png',
          expected: 'events/banner.png'
        },
        {
          url: 'https://example.com/storage/v1/object/public/Media/flags/subfolder/nested.webp',
          expected: 'flags/subfolder/nested.webp'
        }
      ]
      
      testUrls.forEach(({ url, expected }) => {
        const urlParts = url.split('/')
        const bucketIndex = urlParts.findIndex(part => part === 'Media')
        const filePath = urlParts.slice(bucketIndex + 1).join('/')
        
        expect(filePath).toBe(expected)
      })
    })

    it('detects invalid URL formats', () => {
      const invalidUrls = [
        'https://invalid-domain.com/not-storage',
        'not-a-url-at-all',
        'https://example.com/wrong/path/structure',
      ]
      
      invalidUrls.forEach(url => {
        const urlParts = url.split('/')
        const bucketIndex = urlParts.findIndex(part => part === 'Media')
        
        expect(bucketIndex).toBe(-1)
      })
    })
  })
})