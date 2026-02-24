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

    // Get signed URL for the uploaded file (expires in 7 days)
    const { data: urlData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 604800) // 7 days in seconds

    if (signError) {
      console.error('Error creating signed URL:', signError)
      throw new Error(`Failed to create signed URL: ${signError.message}`)
    }

    return urlData.signedUrl
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
  console.log('🚀 uploadFlagImages called with', files.length, 'files')
  console.log('📁 Files to upload:', files.map(f => ({ name: f.name, size: f.size, type: f.type })))

  if (!files.length) {
    console.log('ℹ️ No files to upload, returning empty array')
    return []
  }

  // Check if user is authenticated
  console.log('🔐 Checking user authentication...')
  const { data: { user } } = await supabase.auth.getUser()
  console.log('👤 User authentication result:', user ? 'authenticated' : 'not authenticated')

  if (!user) {
    console.error('❌ User not authenticated')
    throw new Error('User must be authenticated to upload images')
  }

  const uploadPromises = files.map(async (file, index) => {
    try {
      console.log(`🔄 Processing file ${index + 1}/${files.length}: ${file.name}`)

      // Compress the image before upload with optimized settings for flags
      console.log('🗜️ Compressing image...')
      const compressedFile = await compressImage(file, 1600, 1600, 0.8)
      console.log('✅ Image compressed:', {
        originalSize: file.size,
        compressedSize: compressedFile.size,
        reduction: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
      })

      // Generate unique filename and organize in flags subdirectory
      const fileName = generateFileName(file.name)
      const filePath = `flags/${fileName}`
      console.log('📝 Generated file path:', filePath)

      // Upload file to Supabase storage with enhanced caching
      console.log('📤 Uploading to Supabase storage...')
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, compressedFile, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: compressedFile.type
        })

      if (error) {
        console.error('❌ Error uploading flag image:', error)
        throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      }

      console.log('✅ File uploaded successfully to:', filePath)

      // Get signed URL for the uploaded file (expires in 7 days)
      const { data: urlData, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 604800) // 7 days in seconds

      if (signError) {
        console.error('❌ Error creating signed URL:', signError)
        throw new Error(`Failed to create signed URL for ${file.name}: ${signError.message}`)
      }

      console.log('🔗 Generated signed URL:', urlData.signedUrl)
      return urlData.signedUrl
    } catch (error) {
      console.error(`❌ Error uploading flag image ${file.name}:`, error)
      throw error
    }
  })

  try {
    console.log('⏳ Waiting for all uploads to complete...')
    const urls = await Promise.all(uploadPromises)
    console.log('✅ All uploads completed successfully:', urls)
    return urls
  } catch (error) {
    console.error('❌ Error uploading flag images:', error)
    throw error
  }
}

/**
 * Upload a profile picture to Supabase storage
 * @param file Image file to upload
 * @param bucket Storage bucket name (default: 'Media')
 * @returns Promise<string> Path in form "BucketName/profiles/filename" for backend profileImagePath
 */
export const uploadProfileImage = async (file: File, bucket: string = 'Media'): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User must be authenticated to upload profile image')
  }
  const compressedFile = await compressImage(file, 800, 800, 0.85)
  const fileName = generateFileName(file.name)
  const filePath = `profiles/${fileName}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, compressedFile, {
      cacheControl: '31536000',
      upsert: false,
      contentType: compressedFile.type
    })
  if (error) {
    console.error('Error uploading profile image:', error)
    throw new Error(`Failed to upload profile image: ${error.message}`)
  }
  return `${bucket}/${filePath}`
}

/**
 * Delete images from Supabase storage
 * @param urls Array of image URLs to delete
 * @param bucket Storage bucket name (default: 'Media')
 * @returns Promise<void>
 */
export const deleteImages = async (urls: string[], bucket: string = 'Media'): Promise<void> => {
  console.log('🗑️ deleteImages called with:', { urls, bucket })
  
  if (!urls.length) {
    console.log('ℹ️ No URLs provided, skipping deletion')
    return
  }

  try {
    // Extract file paths from URLs
    console.log('🔍 Extracting file paths from URLs...')
    const filePaths = urls.map(url => {
      console.log('🔗 Processing URL:', url)
      
      // Handle different URL formats
      if (url.includes('/storage/v1/object/sign/')) {
        // Signed URL format: extract path after bucket name
        const urlParts = url.split('/')
        const bucketIndex = urlParts.findIndex(part => part === bucket)
        if (bucketIndex === -1) {
          console.error('❌ Could not find bucket in URL:', url)
          throw new Error(`Invalid URL format: ${url}`)
        }
        const path = urlParts.slice(bucketIndex + 1).join('/')
        // Remove query parameters from signed URLs
        const cleanPath = path.split('?')[0]
        console.log('📁 Extracted path from signed URL:', cleanPath)
        return cleanPath
      } else if (url.includes('/storage/v1/object/public/')) {
        // Public URL format
        const urlParts = url.split('/')
        const bucketIndex = urlParts.findIndex(part => part === bucket)
        if (bucketIndex === -1) {
          console.error('❌ Could not find bucket in public URL:', url)
          throw new Error(`Invalid URL format: ${url}`)
        }
        const path = urlParts.slice(bucketIndex + 1).join('/')
        console.log('📁 Extracted path from public URL:', path)
        return path
      } else {
        // Assume it's already a file path
        console.log('📁 Using URL as file path:', url)
        return url
      }
    })

    console.log('📂 File paths to delete:', filePaths)

    // Delete files from Supabase storage
    console.log('🚀 Attempting to delete files from Supabase storage...')
    const { error } = await supabase.storage
      .from(bucket)
      .remove(filePaths)

    if (error) {
      console.error('❌ Supabase storage deletion error:', error)
      throw new Error(`Failed to delete images: ${error.message}`)
    }

    console.log('✅ Successfully deleted images from storage')
  } catch (error) {
    console.error('❌ Error deleting images:', error)
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

    // Get all file URLs in storage (using signed URLs for consistency)
    const allStorageUrls = await Promise.all(files.map(async file => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(file.name, 3600) // 1 hour for cleanup check
      if (error) {
        console.warn(`Failed to create signed URL for ${file.name}:`, error)
        return null
      }
      return data.signedUrl
    }))

    // Filter out failed URL generations
    const validStorageUrls = allStorageUrls.filter((url): url is string => url !== null)

    // Find orphaned URLs (in storage but not referenced)
    const orphanedUrls = validStorageUrls.filter(url => !referencedUrls.includes(url))

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