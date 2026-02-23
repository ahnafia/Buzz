import React, { useState, useRef, useCallback, useEffect } from 'react'
import './ImageUpload.css'
import { uploadEventImage, uploadFlagImages } from '../utils/storage'

export interface ImageUploadProps {
  mode: 'single' | 'multiple'
  maxFiles?: number
  maxSizeBytes?: number
  onImagesChange: (urls: string[]) => void
  initialImages?: string[]
  disabled?: boolean
  acceptTypes?: string
  className?: string
  onUploadStart?: () => void
  onUploadComplete?: (urls: string[]) => void
  onUploadError?: (error: string) => void
}

interface UploadState {
  files: File[]
  previews: string[]
  uploading: boolean
  progress: number
  error: string | null
  uploadedUrls: string[]
  retryCount: number
  failedFiles: File[]
}

interface ValidationError {
  type: 'file_size' | 'file_type' | 'file_count' | 'file_dimensions' | 'network' | 'storage'
  message: string
  fileName?: string
  details?: string
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_MAX_FILES = 10
const DEFAULT_ACCEPT_TYPES = 'image/jpeg,image/png,image/webp'
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_BASE = 1000 // 1 second base delay
const MAX_IMAGE_DIMENSION = 4096 // Maximum width/height in pixels

export const ImageUpload: React.FC<ImageUploadProps> = ({
  mode,
  maxFiles = DEFAULT_MAX_FILES,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  onImagesChange,
  initialImages = [],
  disabled = false,
  acceptTypes = DEFAULT_ACCEPT_TYPES,
  className = '',
  onUploadStart,
  onUploadComplete,
  onUploadError
}) => {
  const [state, setState] = useState<UploadState>({
    files: [],
    previews: [],
    uploading: false,
    progress: 0,
    error: null,
    uploadedUrls: [],
    retryCount: 0,
    failedFiles: []
  })
  const [isDragging, setIsDragging] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize with existing images
  useEffect(() => {
    console.log('🔍 initialImages useEffect triggered:', {
      initialImages,
      currentState: {
        previews: state.previews,
        uploadedUrls: state.uploadedUrls,
        uploading: state.uploading
      }
    })
    
    // Don't interfere if we're currently uploading
    if (state.uploading) {
      console.log('⏸️ Skipping initialImages update - upload in progress')
      return
    }
    
    setState(prev => {
      // Check if initialImages are already set to prevent unnecessary updates
      const currentUrls = [...prev.uploadedUrls, ...prev.previews.filter(url => !url.startsWith('blob:'))]
      const newUrls = [...initialImages]
      
      // Compare arrays to see if they're the same
      if (currentUrls.length === newUrls.length && 
          currentUrls.every((url, index) => url === newUrls[index])) {
        console.log('✅ Initial images unchanged, skipping update')
        return prev
      }
      
      // Only update if initialImages is actually different and not empty when we have uploaded content
      if (prev.uploadedUrls.length > 0 && initialImages.length === 0) {
        console.log('⚠️ Preventing reset of uploaded images by empty initialImages')
        return prev
      }
      
      console.log('🔄 Setting initial state from:', prev, 'to initialImages:', initialImages)
      // Clean up any existing blob URLs that aren't in initialImages
      const blobsToCleanup = prev.previews.filter(url => 
        url.startsWith('blob:') && !initialImages.includes(url)
      )
      blobsToCleanup.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
      
      return {
        ...prev,
        previews: [...initialImages],
        uploadedUrls: [...initialImages],
        files: [] // Clear files since we're setting from initialImages
      }
    })
  }, [initialImages, state.uploading])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const validateImageDimensions = useCallback((file: File): Promise<ValidationError | null> => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
          resolve({
            type: 'file_dimensions',
            message: `Image dimensions (${img.width}x${img.height}) exceed maximum allowed size (${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION})`,
            fileName: file.name
          })
        } else {
          resolve(null)
        }
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({
          type: 'file_type',
          message: 'Invalid image file or corrupted data',
          fileName: file.name
        })
      }
      
      img.src = url
    })
  }, [])

  const validateFile = useCallback(async (file: File): Promise<ValidationError | null> => {
    // Check file type
    const acceptedTypes = acceptTypes.split(',').map(type => type.trim())
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0]
        return file.type.startsWith(baseType + '/')
      }
      return file.type === type
    })

    if (!isValidType) {
      return {
        type: 'file_type',
        message: `File type ${file.type} is not supported`,
        fileName: file.name,
        details: `Accepted types: ${acceptTypes}`
      }
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1)
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
      return {
        type: 'file_size',
        message: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
        fileName: file.name
      }
    }

    // Check image dimensions
    const dimensionError = await validateImageDimensions(file)
    if (dimensionError) {
      return dimensionError
    }

    return null
  }, [acceptTypes, maxSizeBytes, validateImageDimensions])

  const validateFiles = useCallback(async (files: File[]): Promise<{ valid: File[], errors: ValidationError[] }> => {
    const valid: File[] = []
    const errors: ValidationError[] = []

    // Check total file count
    const currentCount = state.files.length + state.uploadedUrls.length
    const totalCount = currentCount + files.length
    const maxAllowed = mode === 'single' ? 1 : maxFiles

    if (totalCount > maxAllowed) {
      errors.push({
        type: 'file_count',
        message: `Cannot upload ${files.length} files. Maximum allowed: ${maxAllowed}, current: ${currentCount}`
      })
      return { valid, errors }
    }

    // Validate each file
    for (const file of files) {
      const error = await validateFile(file)
      if (error) {
        errors.push(error)
      } else {
        valid.push(file)
      }
    }

    return { valid, errors }
  }, [state.files.length, state.uploadedUrls.length, mode, maxFiles, validateFile])

  const createPreviews = useCallback((files: File[]): string[] => {
    return files.map(file => URL.createObjectURL(file))
  }, [])

  const cleanupPreviews = useCallback((previews: string[]) => {
    previews.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    })
  }, [])

  const sleep = useCallback((ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }, [])

  const uploadFiles = useCallback(async (files: File[], retryAttempt: number = 0): Promise<string[]> => {
    if (files.length === 0) return []

    try {
      // Create abort controller for this upload
      abortControllerRef.current = new AbortController()
      
      setState(prev => ({ 
        ...prev, 
        uploading: true, 
        progress: 0, 
        error: null,
        retryCount: retryAttempt
      }))

      if (onUploadStart) {
        onUploadStart()
      }

      let uploadedUrls: string[]

      if (mode === 'single') {
        // Upload single event image
        setState(prev => ({ ...prev, progress: 50 }))
        const url = await uploadEventImage(files[0])
        uploadedUrls = [url]
        setState(prev => ({ ...prev, progress: 100 }))
      } else {
        // Upload multiple flag images
        setState(prev => ({ ...prev, progress: 50 }))
        uploadedUrls = await uploadFlagImages(files)
        setState(prev => ({ ...prev, progress: 100 }))
      }

      setState(prev => {
        console.log('🔄 Upload complete, updating state:', {
          mode,
          uploadedUrls,
          currentPreviews: prev.previews,
          currentUploadedUrls: prev.uploadedUrls
        })
        
        // In multiple mode, replace blob URLs with uploaded URLs
        if (mode === 'multiple') {
          const newPreviews = [...prev.previews]
          const newUploadedUrls = [...prev.uploadedUrls, ...uploadedUrls]
          
          // Replace blob URLs with uploaded URLs in order
          uploadedUrls.forEach((uploadedUrl, index) => {
            const blobIndex = newPreviews.findIndex(url => url.startsWith('blob:'))
            if (blobIndex !== -1) {
              console.log(`🔄 Replacing blob URL at index ${blobIndex} with uploaded URL:`, uploadedUrl)
              newPreviews[blobIndex] = uploadedUrl
            } else {
              console.log('⚠️ No blob URL found to replace, adding to end:', uploadedUrl)
              newPreviews.push(uploadedUrl)
            }
          })
          
          // Clean up remaining blob URLs
          const remainingBlobUrls = newPreviews.filter(url => url.startsWith('blob:'))
          cleanupPreviews(remainingBlobUrls)
          
          console.log('✅ Multiple mode - new state:', {
            previews: newPreviews,
            uploadedUrls: newUploadedUrls
          })
          
          return {
            ...prev, 
            uploading: false, 
            progress: 100,
            uploadedUrls: newUploadedUrls,
            previews: newPreviews,
            failedFiles: []
          }
        } else {
          // Single mode - replace everything with the uploaded URL
          cleanupPreviews(prev.previews.filter(url => url.startsWith('blob:')))
          
          console.log('✅ Single mode - new state:', {
            previews: uploadedUrls,
            uploadedUrls: uploadedUrls
          })
          
          return {
            ...prev, 
            uploading: false, 
            progress: 100,
            uploadedUrls: uploadedUrls,
            previews: uploadedUrls,
            failedFiles: []
          }
        }
      })

      if (onUploadComplete) {
        onUploadComplete(uploadedUrls)
      }

      return uploadedUrls
    } catch (error) {
      console.error('Upload error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error'
      const isNetworkError = errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')
      const isStorageError = errorMessage.includes('storage') || errorMessage.includes('quota') || errorMessage.includes('space')
      
      let validationError: ValidationError
      
      if (isNetworkError) {
        validationError = {
          type: 'network',
          message: 'Network error occurred during upload',
          details: errorMessage
        }
      } else if (isStorageError) {
        validationError = {
          type: 'storage',
          message: 'Storage error occurred during upload',
          details: errorMessage
        }
      } else {
        validationError = {
          type: 'network',
          message: 'Upload failed',
          details: errorMessage
        }
      }

      // Retry logic for network errors
      if (isNetworkError && retryAttempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryAttempt) // Exponential backoff
        
        setState(prev => ({ 
          ...prev, 
          uploading: false,
          error: `Upload failed. Retrying in ${delay / 1000} seconds... (Attempt ${retryAttempt + 1}/${MAX_RETRY_ATTEMPTS})`,
          failedFiles: files
        }))

        await sleep(delay)
        return uploadFiles(files, retryAttempt + 1)
      }

      setState(prev => ({ 
        ...prev, 
        uploading: false, 
        progress: 0,
        error: validationError.message,
        failedFiles: files
      }))

      setValidationErrors(prev => [...prev, validationError])

      if (onUploadError) {
        onUploadError(validationError.message)
      }

      throw error
    }
  }, [mode, onUploadStart, onUploadComplete, onUploadError, sleep])

  const retryFailedUpload = useCallback(async () => {
    if (state.failedFiles.length > 0) {
      try {
        await uploadFiles(state.failedFiles, 0)
      } catch (error) {
        // Error already handled in uploadFiles
      }
    }
  }, [state.failedFiles, uploadFiles])

  const handleFiles = useCallback(async (files: File[]) => {
    if (disabled || files.length === 0) return

    setState(prev => ({ ...prev, error: null }))
    setValidationErrors([])

    const { valid, errors } = await validateFiles(files)

    if (errors.length > 0) {
      setValidationErrors(errors)
      setState(prev => ({ 
        ...prev, 
        error: errors.map(e => e.fileName ? `${e.fileName}: ${e.message}` : e.message).join('; ')
      }))
      return
    }

    if (valid.length === 0) return

    const newPreviews = createPreviews(valid)

    setState(prev => {
      const updatedFiles = mode === 'single' ? valid : [...prev.files, ...valid]
      const updatedPreviews = mode === 'single' ? newPreviews : [...prev.previews, ...newPreviews]

      // Clean up old previews if in single mode
      if (mode === 'single') {
        cleanupPreviews(prev.previews.filter(url => url.startsWith('blob:')))
      }

      return {
        ...prev,
        files: updatedFiles,
        previews: updatedPreviews,
        // Clear uploadedUrls in single mode when adding new files
        uploadedUrls: mode === 'single' ? [] : prev.uploadedUrls
      }
    })

    // Auto-upload files
    try {
      await uploadFiles(valid)
    } catch (error) {
      // Error already handled in uploadFiles
    }
  }, [disabled, validateFiles, createPreviews, cleanupPreviews, mode, uploadFiles])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(Array.from(files))
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }, [handleFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [disabled, handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const removeImage = useCallback((index: number) => {
    setState(prev => {
      const newFiles = [...prev.files]
      const newPreviews = [...prev.previews]
      const newUploadedUrls = [...prev.uploadedUrls]

      // Clean up blob URL if it's a local preview
      if (newPreviews[index]?.startsWith('blob:')) {
        URL.revokeObjectURL(newPreviews[index])
      }

      newFiles.splice(index, 1)
      newPreviews.splice(index, 1)
      
      // Remove from uploaded URLs if it exists
      if (index < newUploadedUrls.length) {
        newUploadedUrls.splice(index, 1)
      }

      return {
        ...prev,
        files: newFiles,
        previews: newPreviews,
        uploadedUrls: newUploadedUrls
      }
    })
  }, [])

  const clearAll = useCallback(() => {
    // Cancel any ongoing upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState(prev => {
      // Clean up all blob URLs
      cleanupPreviews(prev.previews.filter(url => url.startsWith('blob:')))

      return {
        ...prev,
        files: [],
        previews: [],
        error: null,
        uploading: false,
        progress: 0,
        uploadedUrls: [],
        retryCount: 0,
        failedFiles: []
      }
    })
    
    setValidationErrors([])
  }, [cleanupPreviews])

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    setState(prev => ({
      ...prev,
      uploading: false,
      progress: 0,
      error: 'Upload cancelled',
      failedFiles: []
    }))
  }, [])

  // Track the last notified URLs to prevent infinite loops
  const lastNotifiedUrls = useRef<string[]>([])

  // Notify parent of changes - use useCallback to prevent infinite loops
  const notifyParent = useCallback((uploadedUrls: string[], previews: string[]) => {
    const allUrls = [...uploadedUrls, ...previews.filter(url => !url.startsWith('blob:'))]
    
    console.log('🔔 notifyParent called:', {
      uploadedUrls,
      previews,
      filteredPreviews: previews.filter(url => !url.startsWith('blob:')),
      allUrls
    })
    
    // Check if URLs have actually changed to prevent infinite loops
    const urlsChanged = allUrls.length !== lastNotifiedUrls.current.length || 
                       allUrls.some((url, index) => url !== lastNotifiedUrls.current[index])
    
    if (urlsChanged) {
      console.log('📤 Sending to parent (URLs changed):', allUrls)
      lastNotifiedUrls.current = [...allUrls]
      onImagesChange(allUrls)
    } else {
      console.log('⏸️ Not sending to parent (URLs unchanged)')
    }
  }, [onImagesChange])

  useEffect(() => {
    console.log('ImageUpload state:', {
      uploadedUrls: state.uploadedUrls,
      previews: state.previews,
      mode
    })
    notifyParent(state.uploadedUrls, state.previews)
  }, [state.uploadedUrls, state.previews, notifyParent, mode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPreviews(state.previews.filter(url => url.startsWith('blob:')))
    }
  }, [cleanupPreviews, state.previews])

  const openFileDialog = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      openFileDialog()
    }
  }, [disabled, openFileDialog])

  const hasImages = state.previews.length > 0
  const maxAllowed = mode === 'single' ? 1 : maxFiles
  const canAddMore = state.previews.length < maxAllowed && !state.uploading
  const hasValidationErrors = validationErrors.length > 0
  const canRetry = state.failedFiles.length > 0 && !state.uploading

  return (
    <div className={`image-upload ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        multiple={mode === 'multiple'}
        className="image-upload__input"
        onChange={handleFileInputChange}
        disabled={disabled || state.uploading}
        aria-label={`Upload ${mode === 'single' ? 'an image' : 'images'}`}
      />

      {/* Upload Area */}
      <div
        className={`image-upload__drop-zone ${isDragging ? 'image-upload__drop-zone--dragging' : ''} ${hasImages ? 'image-upload__drop-zone--has-images' : ''} ${disabled || state.uploading ? 'image-upload__drop-zone--disabled' : ''}`}
        onClick={canAddMore ? openFileDialog : undefined}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled || state.uploading ? -1 : 0}
        aria-label={`${mode === 'single' ? 'Upload an image' : 'Upload images'}. ${canAddMore ? 'Click or drop files here.' : 'Maximum files reached.'}`}
      >
        {!hasImages ? (
          <div className="image-upload__placeholder">
            <div className="image-upload__placeholder-icon">📷</div>
            <div className="image-upload__placeholder-text">
              {mode === 'single' ? 'Drop an image here' : 'Drop images here'}
            </div>
            <div className="image-upload__placeholder-sub">
              or click to browse
            </div>
          </div>
        ) : (
          <div className="image-upload__preview-grid">
            {state.previews.map((preview, index) => (
              <div key={`${preview}-${index}`} className="image-upload__preview-item">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="image-upload__preview-image"
                />
                <button
                  type="button"
                  className="image-upload__remove-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeImage(index)
                  }}
                  aria-label={`Remove image ${index + 1}`}
                  disabled={disabled || state.uploading}
                >
                  ✕
                </button>
                {/* Upload status indicator */}
                {index < state.uploadedUrls.length ? (
                  <div className="image-upload__status image-upload__status--success">
                    ✓
                  </div>
                ) : state.uploading && index < state.files.length ? (
                  <div className="image-upload__status image-upload__status--uploading">
                    <div className="image-upload__status-spinner"></div>
                  </div>
                ) : state.failedFiles.some(f => f.name === state.files[index]?.name) ? (
                  <div className="image-upload__status image-upload__status--error">
                    ⚠️
                  </div>
                ) : null}
              </div>
            ))}
            {canAddMore && (
              <div className="image-upload__add-more">
                <div className="image-upload__add-more-icon">+</div>
                <div className="image-upload__add-more-text">Add more</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {state.uploading && (
        <div className="image-upload__progress">
          <div className="image-upload__progress-bar">
            <div
              className="image-upload__progress-fill"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <div className="image-upload__progress-text">
            Uploading... {Math.round(state.progress)}%
            {state.retryCount > 0 && ` (Retry ${state.retryCount}/${MAX_RETRY_ATTEMPTS})`}
          </div>
          <button
            type="button"
            className="image-upload__cancel-btn"
            onClick={cancelUpload}
            aria-label="Cancel upload"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Validation Errors */}
      {hasValidationErrors && (
        <div className="image-upload__validation-errors">
          {validationErrors.map((error, index) => (
            <div key={index} className={`image-upload__validation-error image-upload__validation-error--${error.type}`} role="alert">
              <div className="image-upload__validation-error-message">
                {error.fileName && <strong>{error.fileName}:</strong>} {error.message}
              </div>
              {error.details && (
                <div className="image-upload__validation-error-details">
                  {error.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* General Error Message */}
      {state.error && (
        <div className="image-upload__error" role="alert">
          {state.error}
          {canRetry && (
            <button
              type="button"
              className="image-upload__retry-btn"
              onClick={retryFailedUpload}
              disabled={state.uploading}
            >
              Retry Upload
            </button>
          )}
        </div>
      )}

      {/* Info Text */}
      <div className="image-upload__info">
        {mode === 'single' ? (
          <span>Upload 1 image (max {(maxSizeBytes / (1024 * 1024)).toFixed(1)}MB)</span>
        ) : (
          <span>
            Upload up to {maxFiles} images ({state.previews.length}/{maxFiles}) • 
            Max {(maxSizeBytes / (1024 * 1024)).toFixed(1)}MB each
          </span>
        )}
      </div>

      {/* Clear All Button */}
      {hasImages && (
        <button
          type="button"
          className="image-upload__clear-all"
          onClick={clearAll}
          disabled={disabled}
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export default ImageUpload