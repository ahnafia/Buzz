// Test script to verify flag image parsing logic
// This simulates the flag data structure and tests our parsing function

// Simulate the updated parseFlagImageUrls function
function parseFlagImageUrls(flag) {
  // Prefer the new imagePaths array if it exists and has content
  if (flag.imagePaths && flag.imagePaths.length > 0) {
    return flag.imagePaths.filter(Boolean)
  }
  
  // Fall back to legacy imageUrl field (could be comma-separated)
  if (flag.imageUrl && flag.imageUrl.trim()) {
    return flag.imageUrl.split(',').map((s) => s.trim()).filter(Boolean)
  }
  
  return []
}

// Test cases
const testFlags = [
  // Case 1: New imagePaths array (preferred)
  {
    id: 'flag1',
    title: 'Test Flag 1',
    imagePaths: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    imageUrl: 'https://example.com/legacy.jpg' // Should be ignored in favor of imagePaths
  },
  
  // Case 2: Legacy imageUrl with comma-separated values
  {
    id: 'flag2',
    title: 'Test Flag 2',
    imageUrl: 'https://example.com/image1.jpg,https://example.com/image2.jpg,https://example.com/image3.jpg'
  },
  
  // Case 3: Legacy imageUrl with single value
  {
    id: 'flag3',
    title: 'Test Flag 3',
    imageUrl: 'https://example.com/single-image.jpg'
  },
  
  // Case 4: Empty imagePaths array, fallback to imageUrl
  {
    id: 'flag4',
    title: 'Test Flag 4',
    imagePaths: [],
    imageUrl: 'https://example.com/fallback.jpg'
  },
  
  // Case 5: No images at all
  {
    id: 'flag5',
    title: 'Test Flag 5'
  },
  
  // Case 6: Empty strings and null values
  {
    id: 'flag6',
    title: 'Test Flag 6',
    imagePaths: ['', null, 'https://example.com/valid.jpg', ''],
    imageUrl: ''
  }
]

console.log('Testing flag image parsing logic:\n')

testFlags.forEach((flag, index) => {
  const result = parseFlagImageUrls(flag)
  console.log(`Test ${index + 1}: ${flag.title}`)
  console.log(`  Input imagePaths: ${JSON.stringify(flag.imagePaths)}`)
  console.log(`  Input imageUrl: ${JSON.stringify(flag.imageUrl)}`)
  console.log(`  Parsed result: ${JSON.stringify(result)}`)
  console.log(`  Expected behavior: ${getExpectedBehavior(flag)}`)
  console.log('')
})

function getExpectedBehavior(flag) {
  if (flag.imagePaths && flag.imagePaths.length > 0) {
    const filtered = flag.imagePaths.filter(Boolean)
    if (filtered.length > 0) {
      return `Use imagePaths array: ${JSON.stringify(filtered)}`
    }
  }
  
  if (flag.imageUrl && flag.imageUrl.trim()) {
    const split = flag.imageUrl.split(',').map(s => s.trim()).filter(Boolean)
    return `Use imageUrl (split): ${JSON.stringify(split)}`
  }
  
  return 'No images (empty array)'
}