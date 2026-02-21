/**
 * Image optimization utilities for the Buzz application
 * Provides helper functions for managing image lifecycle and optimization
 */

import { 
  uploadEventImage, 
  uploadFlagImages, 
  cleanupOrphanedImages, 
  batchDeleteImages,
  getOptimizedImageUrl,
  filterValidImageUrls
} from './storage'

/**
 * Configuration for image optimization
 */
export interface ImageOptimizationConfig {
  // Compression settings
  maxWidth: number
  maxHeight: number
  quality: number
  
  // Cleanup settings
  enableAutoCleanup: boolean
  cleanupInterval: number // in milliseconds
  
  // Caching settings
  cacheMaxAge: number // in seconds
}

/**
 * Default configuration for image optimization
 */
export const DEFAULT_IMAGE_CONFIG: ImageOptimizationConfig = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.8,
  enableAutoCleanup: false,
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
  cacheMaxAge: 31536000 // 1 year
}

/**
 * Image manager class for handling image lifecycle
 */
export class ImageManager {
  private config: ImageOptimizationConfig
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: Partial<ImageOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_IMAGE_CONFIG, ...config }
    
    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup()
    }
  }

  /**
   * Upload and optimize event banner image
   */
  async uploadEventBanner(file: File): Promise<string> {
    try {
      const url = await uploadEventImage(file)
      console.log('Event banner uploaded successfully:', url)
      return url
    } catch (error) {
      console.error('Failed to upload event banner:', error)
      throw error
    }
  }

  /**
   * Upload and optimize multiple flag images
   */
  async uploadFlagGallery(files: File[]): Promise<string[]> {
    try {
      const urls = await uploadFlagImages(files)
      console.log(`${urls.length} flag images uploaded successfully`)
      return urls
    } catch (error) {
      console.error('Failed to upload flag images:', error)
      throw error
    }
  }

  /**
   * Get optimized image URLs for display
   */
  getOptimizedUrls(
    urls: string[], 
    options: {
      width?: number
      height?: number
      quality?: number
      format?: 'webp' | 'jpeg' | 'png'
    } = {}
  ): string[] {
    return urls.map(url => getOptimizedImageUrl(url, options))
  }

  /**
   * Clean up images that are no longer referenced
   */
  async performCleanup(referencedUrls: string[], dryRun: boolean = false): Promise<{
    deleted: string[]
    errors: string[]
  }> {
    try {
      console.log(`Starting image cleanup (dry run: ${dryRun})...`)
      const result = await cleanupOrphanedImages(referencedUrls, 'media', dryRun)
      
      if (dryRun) {
        console.log(`Cleanup dry run complete. Would delete ${result.deleted.length} images`)
      } else {
        console.log(`Cleanup complete. Deleted ${result.deleted.length} images`)
      }
      
      if (result.errors.length > 0) {
        console.warn('Cleanup errors:', result.errors)
      }
      
      return result
    } catch (error) {
      console.error('Cleanup failed:', error)
      throw error
    }
  }

  /**
   * Validate and filter image URLs
   */
  async validateImageUrls(urls: string[]): Promise<string[]> {
    try {
      const validUrls = await filterValidImageUrls(urls)
      const invalidCount = urls.length - validUrls.length
      
      if (invalidCount > 0) {
        console.warn(`Found ${invalidCount} invalid image URLs`)
      }
      
      return validUrls
    } catch (error) {
      console.error('URL validation failed:', error)
      throw error
    }
  }

  /**
   * Batch delete specific images
   */
  async deleteImages(urls: string[]): Promise<{
    success: string[]
    failed: string[]
  }> {
    try {
      console.log(`Deleting ${urls.length} images...`)
      const result = await batchDeleteImages(urls)
      
      console.log(`Deletion complete. Success: ${result.success.length}, Failed: ${result.failed.length}`)
      
      if (result.failed.length > 0) {
        console.warn('Failed to delete:', result.failed)
      }
      
      return result
    } catch (error) {
      console.error('Batch deletion failed:', error)
      throw error
    }
  }

  /**
   * Start automatic cleanup process
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        console.log('Running automatic image cleanup...')
        // Note: In a real implementation, you'd need to fetch current referenced URLs
        // from your database or API
        await this.performCleanup([])
      } catch (error) {
        console.error('Automatic cleanup failed:', error)
      }
    }, this.config.cleanupInterval)
  }

  /**
   * Stop automatic cleanup process
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ImageOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart auto cleanup if settings changed
    if (this.cleanupTimer) {
      this.stopAutoCleanup()
      if (this.config.enableAutoCleanup) {
        this.startAutoCleanup()
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ImageOptimizationConfig {
    return { ...this.config }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoCleanup()
  }
}

/**
 * Create a default image manager instance
 */
export const imageManager = new ImageManager()

/**
 * Helper function to get responsive image URLs for different screen sizes
 */
export function getResponsiveImageUrls(url: string): {
  thumbnail: string
  small: string
  medium: string
  large: string
  original: string
} {
  return {
    thumbnail: getOptimizedImageUrl(url, { width: 150, height: 150, quality: 0.7 }),
    small: getOptimizedImageUrl(url, { width: 400, height: 400, quality: 0.8 }),
    medium: getOptimizedImageUrl(url, { width: 800, height: 800, quality: 0.8 }),
    large: getOptimizedImageUrl(url, { width: 1200, height: 1200, quality: 0.85 }),
    original: url
  }
}

/**
 * Helper function to preload images for better user experience
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  const promises = urls.map(url => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`Failed to preload image: ${url}`))
      img.src = url
    })
  })
  
  return Promise.all(promises)
}