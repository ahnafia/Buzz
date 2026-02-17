import { supabase } from '../lib/supabase'

/**
 * Upload multiple media files to Supabase storage
 * @param files Array of File objects to upload
 * @param bucket Storage bucket name (default: 'media')
 * @returns Promise<string[]> Array of public URLs for uploaded files
 */
export const uploadMediaFiles = async (files: File[], bucket: string = 'media'): Promise<string[]> => {
  if (!files.length) return []

  const uploadPromises = files.map(async (file) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    const filePath = `flags/${fileName}`

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading file:', error)
      throw new Error(`Failed to upload ${file.name}: ${error.message}`)
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return urlData.publicUrl
  })

  try {
    const urls = await Promise.all(uploadPromises)
    return urls
  } catch (error) {
    console.error('Error uploading media files:', error)
    throw error
  }
}