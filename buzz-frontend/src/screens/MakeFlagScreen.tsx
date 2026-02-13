import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import './MakeFlagScreen.css'

const ACCEPT_MEDIA = 'image/*,video/*'

const MakeFlagScreen = () => {
  const [flagName, setFlagName] = useState('')
  const [location, setLocation] = useState('')
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPost, setShowPost] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updatePreview = (files: File[]) => {
    const first = files[0]
    if (!first?.type.startsWith('image/') && !first?.type.startsWith('video/')) return
    setPreviewUrl(prev => {
      URL.revokeObjectURL(prev ?? '')
      return URL.createObjectURL(first)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const next = Array.from(files)
    const combined = [...mediaFiles, ...next]
    setMediaFiles(combined)
    updatePreview(combined)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith('image/') || f.type.startsWith('video/')
    )
    if (!files.length) return
    const combined = [...mediaFiles, ...files]
    setMediaFiles(combined)
    updatePreview(combined)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  const clearMedia = () => {
    setMediaFiles([])
    setPreviewUrl(prev => { URL.revokeObjectURL(prev ?? ''); return null })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="make-flag-screen">
      <header className="make-flag-header">
        <Link to="/" className="make-flag-back">← Back</Link>
        <h1 className="make-flag-title">Create a flag</h1>
      </header>

      <div className="make-flag-body">
        <div className="make-flag-form-column">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_MEDIA}
            multiple
            className="make-flag-file-input"
            aria-label="Upload images or videos"
            onChange={handleFileChange}
          />
          <div
            className={`make-flag-square-area ${isDragging ? 'make-flag-square-area--dragging' : ''} ${mediaFiles.length ? 'make-flag-square-area--has-files' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
            aria-label="Upload images or videos. Click or drop files here."
          >
            {previewUrl ? (
              <div className="make-flag-upload-preview">
                {mediaFiles[0]?.type.startsWith('video/') ? (
                  <video src={previewUrl} className="make-flag-upload-preview-media" muted playsInline />
                ) : (
                  <img src={previewUrl} alt="" className="make-flag-upload-preview-media" />
                )}
                <span className="make-flag-upload-count">{mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''}</span>
                <button type="button" className="make-flag-upload-clear" onClick={e => { e.stopPropagation(); clearMedia() }} aria-label="Remove uploads">✕</button>
              </div>
            ) : (
              <>
                <span className="make-flag-upload-placeholder-text">Drop images or videos here</span>
                <span className="make-flag-upload-placeholder-sub">or click to browse</span>
              </>
            )}
          </div>
          <div className="make-flag-field">
            <label className="make-flag-label">Flag Name:</label>
            <input
              type="text"
              className="make-flag-input"
              value={flagName}
              onChange={(e) => setFlagName(e.target.value)}
              placeholder="Enter flag name"
            />
          </div>

          <div className="make-flag-field">
            <label className="make-flag-label">Location:</label>
            <input
              type="text"
              className="make-flag-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
            />
          </div>

          <div className="make-flag-field">
            <label className="make-flag-label">Caption:</label>
            <input
              type="text"
              className="make-flag-input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Enter caption"
            />
          </div>

          <div className="make-flag-field">
            <label className="make-flag-label">Tags:</label>
            <input
              type="text"
              className="make-flag-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags (e.g. food, fun)"
            />
          </div>

          <button
            type="button"
            className="make-flag-generate-btn"
            onClick={() => setShowPost(true)}
          >
            Generate
          </button>
        </div>

        {showPost && (
          <aside className="make-flag-post-column" aria-label="Generated post preview">
            <article className="make-flag-post-preview">
              <div className="make-flag-post-media">
                {previewUrl ? (
                  mediaFiles[0]?.type.startsWith('video/') ? (
                    <video src={previewUrl} className="make-flag-post-media-item" muted playsInline />
                  ) : (
                    <img src={previewUrl} alt="" className="make-flag-post-media-item" />
                  )
                ) : (
                  <div className="make-flag-post-media-placeholder">No media</div>
                )}
                {mediaFiles.length > 1 && (
                  <span className="make-flag-post-media-count">+{mediaFiles.length - 1}</span>
                )}
              </div>
              <div className="make-flag-post-info">
                <div className="make-flag-post-info-row">
                  <span className="make-flag-post-info-label">Name</span>
                  <span className="make-flag-post-info-value">{flagName || '—'}</span>
                </div>
                <div className="make-flag-post-info-row">
                  <span className="make-flag-post-info-label">Location</span>
                  <span className="make-flag-post-info-value">{location || '—'}</span>
                </div>
                <div className="make-flag-post-info-row">
                  <span className="make-flag-post-info-label">Caption</span>
                  <span className="make-flag-post-info-value">{caption || '—'}</span>
                </div>
                <div className="make-flag-post-info-row">
                  <span className="make-flag-post-info-label">Tags</span>
                  <span className="make-flag-post-info-value">{tags || '—'}</span>
                </div>
              </div>
            </article>
            <button type="button" className="make-flag-plant-btn">
              <svg className="make-flag-plant-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              <span>Plant</span>
            </button>
          </aside>
        )}
      </div>
    </div>
  )
}

export default MakeFlagScreen
