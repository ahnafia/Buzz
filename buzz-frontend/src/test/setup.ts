import '@testing-library/jest-dom'

// Mock URL.createObjectURL and URL.revokeObjectURL for tests
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock File constructor for tests
global.File = class MockFile {
  name: string
  size: number
  type: string
  lastModified: number

  constructor(bits: BlobPart[], filename: string, options: FilePropertyBag = {}) {
    this.name = filename
    this.size = bits.reduce((acc, bit) => acc + (typeof bit === 'string' ? bit.length : bit.size || 0), 0)
    this.type = options.type || ''
    this.lastModified = options.lastModified || Date.now()
  }
} as any

// Mock DataTransfer for drag and drop tests
global.DataTransfer = class MockDataTransfer {
  files: FileList
  items: DataTransferItemList

  constructor() {
    this.files = [] as any
    this.items = [] as any
  }
} as any