import { supabase } from '../lib/supabase'

/**
 * Compress an image file to optimize storage and loading performance
 * @param file Original image file
 * @param maxWidth Maximum width in pixels (default: 2048)
 * @param maxHeight Maximum height in pixels (default: 2048)
 * @param quality JPEG quality (0-1, default: 0.8)
 * @param outputFormat Output format ('webp' | 'jpeg' | 'png', default: original format)
 * @returns Promise<File> Compressed image file
 */
const compressImage = async (
  file: File,
  maxWidth: number = 2048,
  maxHeight: number = 2048,
  quality: number = 0.8,
  outputFormat?: 'webp' | 'jpeg' | 'png'
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress the image
      ctx?.drawImage(img, 0, 0, width, height)

      // Determine output format
      let mimeType = file.type
      if (outputFormat) {
        mimeType = `image/${outputFormat}`
      }

      // Use WebP if supported and no specific format requested
      if (!outputFormat && supportsWebP()) {
        mimeType = 'image/webp'
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Generate new filename with correct extension
            const originalName = file.name
            const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'))
            const newExtension = mimeType.split('/')[1]
            const newFileName = `${nameWithoutExt}.${newExtension}`

            const compressedFile = new File([blob], newFileName, {
              type: mimeType,
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        mimeType,
        quality
      )
    }

    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Check if the browser supports WebP format
 * @returns boolean True if WebP is supported
 */
const supportsWebP = (): boolean => {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

/**
 * Generate a unique filename with timestamp and random string
 * @param originalName Original filename
 * @returns string Unique filename
 */
const generateFileName = (originalName: string): string => {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const fileExtension = originalName.split('.').pop()
  return `${timestamp}_${randomString}.${fileExtension}`
}

/**
 * Upload a single event banner image to Supabase storage
 * @param file Image file to upload
 * @param bucket Storage bucket name (default: 'Media')
 * @returns Promise<string> Public URL for uploaded image
 */
export const uploadEventImage = async (file: File, bucket: string = 'Media'): Promise<string> => {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User must be authenticated to upload images')
    }

    // Compress the image before upload with optimized settings for events
    const compressedFile = await compressImage(file, 1920, 1080, 0.85)

    // Generate unique filename and organize in events subdirectory
    const fileName = generateFileName(file.name)
    const filePath = `events/${fileName}`

    // Upload file to Supabase storage with enhanced caching
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressedFile, {
        cacheControl: '31536000', // 1 year cache
        upsert: false,
        contentType: compressedFile.type
      })

    if (error) {
      console.error('Error uploading event image:', error)
      throw new Error(`Failed to upload event image: ${error.message}`)
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading event image:', error)
    throw error
  }
}

/**
 * Upload multiple flag images to Supabase storage
 * @param files Array of image files to upload
 * @param bucket Storage bucket name (default: 'Media')
 * @returns Promise<string[]> Array of public URLs for uploaded images
 */
export const uploadFlagImages = async (files: File[], bucket: string = 'Media'): Promise<string[]> => {
  if (!files.length) return []

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User must be authenticated to upload images')
  }

  const uploadPromises = files.map(async (file) => {
    try {
      // Compress the image before upload with optimized settings for flags
      const compressedFile = await compressImage(file, 1600, 1600, 0.8)

      // Generate unique filename and organize in flags subdirectory
      const fileName = generateFileName(file.name)
      const filePath = `flags/${fileName}`

      // Upload file to Supabase storage with enhanced caching
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, compressedFile, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: compressedFile.type
        })

      if (error) {
        console.error('Error uploading flag image:', error)
        throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error(`Error uploading flag image ${file.name}:`, error)
      throw error
    }
  })

  try {
    const urls = await Promise.all(uploadPromises)
    return urls
  } catch (error) {
    console.error('Error uploading flag images:', error)
    throw error
  }
}

/**
 * Delete images from Supabase storage
 * @param urls Array of image URLs to delete
 * @param bucket Storage bucket name (default: 'Media')
 * @returns Promise<void>
 */
export const deleteImages = async (urls: string[], bucket: string = 'Media'): Promise<void> => {
  if (!urls.length) return

  try {
    // Extract file paths from URLs
    const filePaths = urls.map(url => {
      // Extract the path after the bucket name from the URL
      const urlParts = url.split('/')
      const bucketIndex = urlParts.findIndex(part => part === bucket)
      if (bucketIndex === -1) {
        throw new Error(`Invalid URL format: ${url}`)
      }
      return urlParts.slice(bucketIndex + 1).join('/')
    })

    // Delete files from Supabase storage
    const { error } = await supabase.storage
      .from(bucket)
      .remove(filePaths)

    if (error) {
      console.error('Error deleting images:', error)
      throw new Error(`Failed to delete images: ${error.message}`)
    }
  } catch (error) {
    console.error('Error deleting images:', error)
    throw error
  }
}

/**
 * Extract file path from Supabase storage URL
 * @param url Full Supabase storage URL
 * @param bucket Storage bucket name (default: 'Media')
 * @returns string File path within the bucket
 */
export const extractFilePathFromUrl = (url: string, bucket: string = 'Media'): string => {
  try {
    const urlParts = url.split('/')
    const bucketIndex = urlParts.findIndex(part => part === bucket)
    if (bucketIndex === -1) {
      throw new Error(`Invalid URL format: ${url}`)
    }
    return urlParts.slice(bucketIndex + 1).join('/')
  } catch (error) {
    console.error('Error extracting file path from URL:', error)
    throw error
  }
}

/**
 * Check if an image URL is valid and accessible
 * @param url Image URL to validate
 * @returns Promise<boolean> True if image is accessible
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type')
    return response.ok && (contentType?.startsWith('image/') ?? false)
  } catch {
    return false
  }
}

/**
 * Filter out invalid or broken image URLs from an array
 * @param urls Array of image URLs to validate
 * @returns Promise<string[]> Array of valid image URLs
 */
export const filterValidImageUrls = async (urls: string[]): Promise<string[]> => {
  if (!urls.length) return []

  const validationPromises = urls.map(async (url) => {
    const isValid = await validateImageUrl(url)
    return isValid ? url : null
  })

  const results = await Promise.all(validationPromises)
  return results.filter((url): url is string => url !== null)
}

/**
 * Get optimized image URL with caching parameters
 * @param url Original image URL
 * @param options Optimization options
 * @returns string Optimized URL with cache parameters
 */
export const getOptimizedImageUrl = (
  url: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
  } = {}
): string => {
  try {
    const urlObj = new URL(url)

    // Add transformation parameters for Supabase storage
    if (options.width) urlObj.searchParams.set('width', options.width.toString())
    if (options.height) urlObj.searchParams.set('height', options.height.toString())
    if (options.quality) urlObj.searchParams.set('quality', options.quality.toString())
    if (options.format) urlObj.searchParams.set('format', options.format)

    // Add cache control
    urlObj.searchParams.set('cache', '3600')

    return urlObj.toString()
  } catch (error) {
    console.error('Error optimizing image URL:', error)
    return url // Return original URL if optimization fails
  }
}

/**
 * Batch delete images with error handling and retry logic
 * @param urls Array of image URLs to delete
 * @param bucket Storage bucket name (default: 'Media')
 * @param retries Number of retry attempts (default: 3)
 * @returns Promise<{success: string[], failed: string[]}> Results of deletion attempts
 */
export const batchDeleteImages = async (
  urls: string[],
  bucket: string = 'Media',
  retries: number = 3
): Promise<{ success: string[], failed: string[] }> => {
  if (!urls.length) return { success: [], failed: [] }

  const success: string[] = []
  const failed: string[] = []

  for (const url of urls) {
    let attempts = 0
    let deleted = false

    while (attempts < retries && !deleted) {
      try {
        await deleteImages([url], bucket)
        success.push(url)
        deleted = true
      } catch (error) {
        attempts++
        console.error(`Attempt ${attempts} failed to delete ${url}:`, error)

        if (attempts >= retries) {
          failed.push(url)
        } else {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000))
        }
      }
    }
  }

  return { success, failed }
}

/**
 * Clean up orphaned images that are no longer referenced
 * @param referencedUrls Array of URLs that are still in use
 * @param bucket Storage bucket name (default: 'Media')
 * @param dryRun If true, only return what would be deleted without actually deleting
 * @returns Promise<{deleted: string[], errors: string[]}> Results of cleanup operation
 */
export const cleanupOrphanedImages = async (
  referencedUrls: string[],
  bucket: string = 'Media',
  dryRun: boolean = false
): Promise<{ deleted: string[], errors: string[] }> => {
  try {
    // List all files in the bucket
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    if (!files) {
      return { deleted: [], errors: [] }
    }

    // Get all file URLs in storage
    const allStorageUrls = files.map(file => {
      const { data } = supabase.storage.from(bucket).getPublicUrl(file.name)
      return data.publicUrl
    })

    // Find orphaned URLs (in storage but not referenced)
    const orphanedUrls = allStorageUrls.filter(url => !referencedUrls.includes(url))

    if (dryRun) {
      console.log('Dry run - would delete:', orphanedUrls)
      return { deleted: orphanedUrls, errors: [] }
    }

    // Delete orphaned images
    const { success, failed } = await batchDeleteImages(orphanedUrls, bucket)

    return {
      deleted: success,
      errors: failed
    }
  } catch (error) {
    console.error('Error during cleanup:', error)
    return { deleted: [], errors: [error instanceof Error ? error.message : 'Unknown error'] }
  }
}

/**
 * Upload multiple media files to Supabase storage (legacy function - maintained for backward compatibility)
 * @param files Array of File objects to upload
 * @param bucket Storage bucket name (default: 'Media')
 * @returns Promise<string[]> Array of public URLs for uploaded files
 */
export const uploadMediaFiles = async (files: File[], bucket: string = 'Media'): Promise<string[]> => {
  // Use the new uploadFlagImages function for backward compatibility
  return uploadFlagImages(files, bucket)
}