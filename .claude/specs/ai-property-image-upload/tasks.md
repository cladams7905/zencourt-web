# Implementation Plan

## Phase 1: Foundation and Empty State

- [ ] 1. Remove example projects and implement empty state

  - Remove hardcoded projects array from ProjectsView.tsx
  - Add state management for projects list (initially empty)
  - Create EmptyState component with proper styling and CTA button
  - Conditionally render EmptyState when projects array is empty
  - Hide filter tabs when no projects exist
  - Test empty state rendering and button click handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Set up modal infrastructure
  - Add modal open/close state to ProjectsView component
  - Connect "New Project" button to open modal
  - Create basic UploadProjectModal component using Radix UI Dialog
  - Implement modal open/close functionality with proper state management
  - Add modal header with title and close button
  - Test modal opening, closing, and ESC key handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

## Phase 2: File Upload Interface

- [ ] 3. Create DragDropZone component

  - Create DragDropZone.tsx with TypeScript interfaces for props
  - Implement basic file input with hidden input element
  - Add click-to-upload functionality with file picker dialog
  - Style the drop zone with proper visual states (default, hover)
  - Test file selection via click with multiple file support
  - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4_

- [ ] 4. Implement drag-and-drop functionality

  - Add drag event handlers (onDragEnter, onDragOver, onDragLeave, onDrop)
  - Prevent default browser behavior for drag events
  - Add visual feedback for drag states (isDragging state)
  - Update styling for active drag state
  - Test drag-and-drop file selection
  - _Requirements: 3.2, 3.3_

- [ ] 5. Add file validation logic
  - Implement file type validation (jpg, jpeg, png, webp only)
  - Add file size validation (max 10MB per file)
  - Add file count validation (max 50 files)
  - Display validation error messages for invalid files
  - Filter out invalid files and only pass valid ones to parent
  - Test all validation scenarios with different file types and sizes
  - _Requirements: 3.4, 3.5, 5.2_

## Phase 3: Image Upload and Storage

- [ ] 6. Create storage service infrastructure

  - Create src/services/storage.ts file with TypeScript interfaces
  - Implement uploadFile function using Vercel Blob Storage API
  - Implement uploadFiles batch function with error handling per file
  - Add environment variable for storage configuration
  - Test upload with mock files and verify URL return
  - _Requirements: 6.1, 6.2_

- [ ] 7. Implement image preview generation

  - Add FileReader to generate preview URLs from File objects
  - Create ImageData type with preview URL, status, and metadata
  - Generate thumbnails for uploaded files using canvas API
  - Display image thumbnails in grid layout within modal
  - Add loading state while generating previews
  - Test preview generation for different image formats
  - _Requirements: 3.7_

- [ ] 8. Build upload progress tracking
  - Add upload status tracking per image (pending, uploading, uploaded, error)
  - Implement progress indicator UI component
  - Update UI as each image uploads
  - Handle upload errors with retry capability per image
  - Display overall progress (X of Y uploaded)
  - Test concurrent upload handling and error recovery
  - _Requirements: 3.7, 6.1_

## Phase 4: AI Room Classification

- [ ] 9. Create AI Vision service

  - Create src/services/aiVision.ts with TypeScript interfaces
  - Set up OpenAI API client configuration
  - Implement classifyRoom function with GPT-4 Vision API
  - Create detailed prompt for room classification
  - Parse and validate API response into RoomClassification type
  - Add error handling for API failures and timeouts
  - Test with sample images and verify classification accuracy
  - _Requirements: 5.1, 5.2, 5.6_

- [ ] 10. Implement batch AI analysis

  - Create classifyRoomBatch function for processing multiple images
  - Add rate limiting to respect API quotas (max 10 concurrent requests)
  - Implement retry logic with exponential backoff for failed requests
  - Track analysis progress per image
  - Handle partial failures (some images succeed, others fail)
  - Test batch processing with various image quantities
  - _Requirements: 5.1, 5.2, 5.6_

- [ ] 11. Build image processor orchestration
  - Create src/services/imageProcessor.ts with service interfaces
  - Implement uploadImages method calling storage service
  - Implement analyzeImages method calling AI vision service
  - Coordinate upload → analysis workflow
  - Update modal state as processing progresses
  - Add loading indicators for AI analysis phase
  - Test complete upload and analysis pipeline
  - _Requirements: 5.1, 5.6, 6.1_

## Phase 5: Image Categorization and Display

- [ ] 12. Implement room categorization logic

  - Create ROOM_CATEGORIES constant with all category metadata
  - Implement categorizeImages function to group by room type
  - Add logic for numbering duplicate rooms (Bedroom 1, 2, 3, etc.)
  - Sort categories in logical order (exterior → living → bedrooms → other)
  - Handle "Other" category for low-confidence classifications
  - Test categorization with various room type combinations
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [ ] 13. Create CategorizedImageGrid component

  - Create CategorizedImageGrid.tsx with TypeScript interfaces
  - Implement category header components with room type and count
  - Build image thumbnail grid within each category
  - Add responsive grid layout (2/3/4 columns based on breakpoint)
  - Display loading states for images still being analyzed
  - Display error states for failed images with retry button
  - Test grid rendering with multiple categories and images
  - _Requirements: 6.1, 6.2, 6.3, 6.6_

- [ ] 14. Add image preview functionality
  - Create image lightbox/preview modal component
  - Implement click handler on thumbnails to open preview
  - Display full-size image in preview modal
  - Add navigation between images (prev/next arrows)
  - Add close functionality (X button, ESC key, click outside)
  - Test preview opening, navigation, and closing
  - _Requirements: 6.4_

## Phase 6: Manual Re-categorization

- [ ] 15. Implement drag-and-drop between categories

  - Add drag handlers to image thumbnails within CategorizedImageGrid
  - Implement drop zones for each category section
  - Update categorization state when image is moved
  - Add visual feedback during drag operation
  - Update category counts after re-categorization
  - Test drag-and-drop re-categorization between different categories
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 16. Add category renaming functionality
  - Add editable category labels with dropdown or input
  - Implement category name change handler
  - Validate custom category names
  - Persist renamed categories with project data
  - Test category renaming and validation
  - _Requirements: 7.4_

## Phase 7: Project Creation and Persistence

- [ ] 17. Create project data model and types

  - Define Project and ProjectImage TypeScript interfaces
  - Create project creation utility functions
  - Add project ID generation (UUID or similar)
  - Define project status states (draft, processing, rendered)
  - Test type safety and data structure validation
  - _Requirements: 8.1, 8.2_

- [ ] 18. Implement project naming step

  - Add ProjectNameInput component to modal
  - Create multi-step modal flow (upload → categorize → name)
  - Add form validation for project name (required, min/max length)
  - Display "Continue" button only when categorization is complete
  - Transition to naming step on Continue click
  - Test step navigation and validation
  - _Requirements: 6.5, 8.1_

- [ ] 19. Build project creation API integration

  - Create project API route (POST /api/projects)
  - Implement project save handler in modal
  - Send project data with images and categorizations to API
  - Handle API success and error responses
  - Display success notification on project creation
  - Close modal and refresh projects list on success
  - Test project creation end-to-end
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [ ] 20. Implement project list refresh
  - Add callback from modal to ProjectsView on project creation
  - Fetch updated projects list from API
  - Update ProjectsView state with new project
  - Display new project card in grid
  - Test that new project appears immediately after creation
  - _Requirements: 8.3_

## Phase 8: Error Handling and Edge Cases

- [ ] 21. Implement comprehensive error handling

  - Add error state management to UploadProjectModal
  - Create ErrorMessage component for displaying errors
  - Handle network errors during upload with retry
  - Handle AI service unavailable with fallback message
  - Handle individual file failures without blocking others
  - Display user-friendly error messages for all error types
  - Test all error scenarios and recovery flows
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ] 22. Add modal close confirmation

  - Detect if upload/analysis is in progress
  - Show confirmation dialog when user attempts to close mid-process
  - Cancel ongoing API requests on confirmed close
  - Clean up state and preview URLs on modal close
  - Test close confirmation and request cancellation
  - _Requirements: 9.4_

- [ ] 23. Implement duplicate image detection

  - Add file hash generation for uploaded images
  - Compare hashes to detect duplicate files
  - Display warning when duplicates are detected
  - Allow user to choose whether to include duplicates
  - Test duplicate detection with same and different files
  - _Edge case handling_

- [ ] 24. Add file size warnings and compression
  - Detect files larger than recommended size (e.g., > 5MB)
  - Display warning for large files
  - Optionally implement client-side image compression
  - Show before/after file sizes if compression is applied
  - Test with various large image files
  - _Edge case handling_

## Phase 9: Accessibility and Polish

- [ ] 25. Implement keyboard navigation

  - Ensure modal is keyboard accessible (Tab navigation)
  - Add keyboard shortcuts (ESC to close, Enter to submit)
  - Enable arrow key navigation in image grid
  - Add focus management when modal opens/closes
  - Test complete keyboard-only workflow
  - _Requirements: 10.2, 10.4_

- [ ] 26. Add ARIA labels and screen reader support

  - Add ARIA labels to drag-drop zone
  - Implement ARIA live regions for upload progress
  - Add ARIA announcements for categorization completion
  - Ensure all interactive elements have accessible names
  - Add alt text or ARIA labels for all images
  - Test with screen reader (VoiceOver or NVDA)
  - _Requirements: 10.4_

- [ ] 27. Implement responsive design

  - Test modal on mobile viewports (< 640px)
  - Adjust modal sizing for tablets (640-1024px)
  - Ensure drag-drop works or show prominent click-upload on mobile
  - Test image grid responsiveness (2/3/4 columns)
  - Adapt category headers for small screens
  - Test on actual mobile devices
  - _Requirements: 10.1, 10.3, 10.5_

- [ ] 28. Add loading states and animations
  - Implement skeleton loaders for image thumbnails
  - Add smooth transitions for modal open/close
  - Animate category sections appearing after analysis
  - Add upload progress animations
  - Implement success animation on project creation
  - Test all animations for smoothness and performance
  - _Polish and UX improvements_
