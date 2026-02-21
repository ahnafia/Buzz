# Implementation Plan

- [x] 1. Create reusable ImageUpload component





  - Create `src/components/ImageUpload.tsx` with support for single/multiple image modes
  - Implement drag and drop functionality with file validation
  - Add image preview, progress indicators, and error handling
  - Create corresponding CSS file with responsive styling
  - Write unit tests for file validation and upload logic
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 5.1, 5.2, 5.3_

- [x] 2. Create ImageCarousel component for flag image navigation





  - Create `src/components/ImageCarousel.tsx` for displaying multiple images
  - Implement touch/swipe navigation and keyboard controls (arrow keys)
  - Add thumbnail indicators and loading states
  - Create CSS file with responsive carousel styling
  - Write unit tests for navigation logic and keyboard interactions
  - _Requirements: 2.2, 2.3, 5.5_

- [x] 3. Enhance storage service for organized image uploads





  - Extend `src/utils/storage.ts` with `uploadEventImage` and `uploadFlagImages` functions
  - Implement proper file organization (events/ and flags/ subdirectories)
  - Add image compression and file name generation logic
  - Create `deleteImages` function for cleanup operations
  - Write unit tests for upload functions and error handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Integrate ImageUpload into EventForm component





  - Modify `src/components/EventForm.tsx` to include single image upload
  - Add image upload field to form with proper validation
  - Update form submission to handle image URL in event data
  - Update EventForm CSS to accommodate image upload section
  - Write integration tests for event creation with banner image
  - _Requirements: 3.1, 3.2, 3.5_
-

- [x] 5. Enhance MakeFlagScreen with improved image handling




  - Replace existing image upload in `src/screens/MakeFlagScreen.tsx` with new ImageUpload component
  - Update flag creation to handle multiple image URLs array
  - Modify API call to send image URLs in proper format
  - Update MakeFlagScreen CSS if needed for new component integration
  - Write integration tests for flag creation with multiple images
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Update API types and interfaces





  - Modify `src/types/api.ts` to include image fields in Event and Flag interfaces
  - Update CreateEventRequest to include optional imagePath field
  - Update CreateFlagRequest to handle imagePaths array
  - Ensure backward compatibility with existing API responses
  - Write type validation tests
  - _Requirements: 1.4, 3.3, 5.1_

- [x] 7. Enhance InteractiveMap popup display for events





  - Modify popup generation in `src/components/InteractiveMap.tsx` to show event banner images
  - Update `buildPopupHtml` function to handle event image display
  - Add proper fallback handling when no image is present
  - Update InteractiveMap CSS for enhanced popup styling
  - Write tests for popup image display logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Integrate ImageCarousel into flag popups





  - Modify flag popup generation in `src/components/InteractiveMap.tsx` to use ImageCarousel
  - Update popup HTML generation to support multiple flag images
  - Implement carousel navigation within popup context
  - Handle cases where flags have no images or single images
  - Write integration tests for flag popup image carousel
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 9. Add image validation and error handling





  - Implement client-side validation for file size, type, and quantity limits
  - Add user-friendly error messages for upload failures
  - Create fallback UI states for image loading errors
  - Implement retry mechanisms for failed uploads
  - Write comprehensive error handling tests
  - _Requirements: 1.5, 2.5, 3.5, 4.4, 5.1, 5.2_

- [x] 10. Implement image cleanup and optimization








  - Add image compression logic before upload to optimize storage
  - Implement proper cleanup when flags/events are deleted
  - Add caching headers and optimization for image serving
  - Create utility functions for image URL management
  - Write tests for cleanup and optimization functions
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 11. Add accessibility and mobile optimization
  - Ensure ImageUpload component is keyboard accessible
  - Add proper ARIA labels and alt text for images
  - Implement touch gestures for ImageCarousel on mobile
  - Optimize image loading and display for mobile devices
  - Write accessibility and mobile interaction tests
  - _Requirements: 2.2, 2.3, 5.5_
- [ ] 12. Create comprehensive integration tests









- [ ] 12. Create comprehensive integration tests

  - Write end-to-end tests for complete flag creation with images
  - Create tests for event creation with banner image
  - Test map popup image display for both flags and events
  - Verify image carousel functionality in popup context
  - Test error scenarios and recovery mechanisms
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.4_