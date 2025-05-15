# Component Documentation

This document provides detailed documentation for the key components in the Civil Rights History Project application. It covers component functionality, props, usage patterns, and examples.

## Component Categories

The application is structured with the following main component categories:

1. **Common Components**: Core UI elements reused throughout the application
2. **Auth Components**: Authentication and authorization related components
3. **Video Components**: Components for video playback and media interaction
4. **Visualization Components**: Data visualization and interactive graphical displays
5. **Node Components**: Specialized components for flow diagram representations
6. **Edge Components**: Connection components for flow diagram relationships
7. **Directory Components**: Components for browsing and organizing content
8. **UI Components**: Interface elements like loading indicators and error displays

## Common Components

### Layout

`Layout` is the primary layout wrapper for all protected pages in the application.

**File Location**: `src/components/common/Layout.jsx`

**Functionality**:
- Provides consistent page structure with sidebar navigation
- Displays loading state during authentication checks
- Handles responsive layout for different screen sizes

**Props**:
- `children`: React nodes to render within the layout

**Example Usage**:
```jsx
<Layout>
  <HomePage />
</Layout>
```

### Sidebar

`Sidebar` provides the main navigation menu for the application.

**File Location**: `src/components/common/Sidebar.jsx`

**Functionality**:
- Renders navigation links to main application pages
- Highlights the active route
- Provides authentication-related actions (logout)
- Supports mobile-responsive collapsible behavior

**Props**: None (uses React Router and Auth Context internally)

**State**:
- `isOpen`: Controls whether the sidebar is expanded or collapsed on mobile

**Key Methods**:
- `toggleSidebar()`: Toggles sidebar visibility on mobile devices
- `isActiveLink()`: Determines if a navigation link matches the current route

### SearchBar

`SearchBar` provides a reusable search input component.

**File Location**: `src/components/common/SearchBar.jsx`

**Functionality**:
- Renders a styled search input with icon
- Handles input changes and search submission
- Supports keyboard navigation

**Props**:
- `value`: Current search term value
- `onChange`: Callback for input changes
- `onSearch`: Callback for search submission
- `placeholder`: Placeholder text for the input

## Auth Components

### ProtectedRoute

`ProtectedRoute` is a higher-order component that restricts access to authenticated users.

**File Location**: `src/components/auth/ProtectedRoute.jsx`

**Functionality**:
- Checks user authentication status
- Redirects unauthenticated users to the login page
- Renders the protected content for authenticated users

**Props**:
- `children`: React nodes to render for authenticated users

### LoginModal

`LoginModal` provides a modal dialog for user authentication.

**File Location**: `src/components/auth/LoginModal.jsx`

**Functionality**:
- Displays login form with email and password fields
- Handles form submission and validation
- Shows login errors
- Supports modal open/close animations

**Props**:
- `isOpen`: Boolean controlling modal visibility
- `onClose`: Callback for when modal is closed
- `onLogin`: Callback for successful login

## Video Components

### VideoPlayer

`VideoPlayer` is a custom YouTube video player component with enhanced functionality for interview segments.

**File Location**: `src/components/VideoPlayer.jsx`

**Functionality**:
- Loads and plays YouTube videos with specific time ranges
- Controls playback based on parent component state
- Reports current playback time to the parent
- Handles seeking to specific timestamps
- Manages cleanup of player resources when unmounting

**Props**:
- `video`: Object containing video metadata and timestamp information
- `onVideoEnd`: Callback function when video reaches end time or encounters error
- `onPlay`: Callback function when video starts playing
- `onPause`: Callback function when video is paused
- `onTimeUpdate`: Callback with current playback time relative to clip start
- `isPlaying`: Boolean indicating whether the video should be playing or paused
- `seekToTime`: Number representing time in seconds (relative to clip start) to seek to

**Key Methods**:
- `getVideoTimeBoundaries()`: Extracts start and end times from the video timestamp
- `syncPlayerWithProps()`: Synchronizes player state with component props
- `checkForClipEnd()`: Monitors playback and triggers end event when clip is complete

**Example Usage**:
```jsx
<VideoPlayer 
  video={interviewSegment}
  onVideoEnd={handleNextSegment}
  onPlay={handlePlay}
  onPause={handlePause}
  onTimeUpdate={updateTimeline}
  isPlaying={playbackState.isPlaying}
  seekToTime={seekPosition}
/>
```

### PlayerControls

`PlayerControls` provides a standardized control interface for video playback.

**File Location**: `src/components/PlayerControls.jsx`

**Functionality**:
- Renders play/pause, skip, and volume controls
- Displays current playback time and progress
- Provides interactive timeline scrubbing
- Supports keyboard shortcuts for control

**Props**:
- `isPlaying`: Boolean indicating current playback state
- `onPlayPause`: Callback for play/pause actions
- `onSeek`: Callback for seeking to a specific time
- `currentTime`: Number representing current playback time in seconds
- `duration`: Number representing total duration in seconds
- `onSkipForward`: Callback for skip forward action
- `onSkipBackward`: Callback for skip backward action

### VideoPanel

`VideoPanel` provides a complete video player interface with related metadata. This component is primarily used in the TranscriptSummary page.

**File Location**: `src/components/VideoPanel.jsx`

**Functionality**:
- Implements its own custom YouTube video player functionality
- Creates a modal-like overlay for video playback
- Provides custom play/pause, seek, and timeline controls
- Displays transcript key points with timestamp markers
- Offers minimize/maximize and close controls

**Usage Context**:
- Used in the TranscriptSummary page for viewing videos related to transcript data
- Appears as a modal overlay when a user wants to view video content related to a transcript
- Controlled by open/close state management in the parent component

**Props**:
- `isOpen`: Boolean controlling the visibility of the panel
- `onClose`: Callback function for closing the panel
- `videoUrl`: URL of the YouTube video to display
- `documentName`: Name of the associated transcript document
- `summaries`: Object containing transcript summaries and key points
- `currentTimestamp`: Current playback timestamp (optional)
- `setCurrentTimestamp`: Function to update the current timestamp (optional)

**Key Methods**:
- `sendCommand()`: Sends commands to the YouTube iframe API
- `handlePlayPause()`: Toggles video playback state
- `formatTime()`: Formats time in seconds to MM:SS or HH:MM:SS format
- `handleSeek()`: Handles seeking to specific timestamps

### TranscriptHeader

`TranscriptHeader` provides header controls and application mode toggling for the TranscriptSummary page.

**File Location**: `src/components/TranscriptHeader.jsx`

**Functionality**:
- Displays the application title with icon
- Shows test mode indicator when enabled
- Provides a data reset button when summaries are available
- Shows application version number
- Allows switching between different application views:
  - "Build Your Own Analysis" (standard mode)
  - "See Complete Workflow Demo" (demonstration mode)

**Props**:
- `summaries`: Object containing transcript summary data (controls visibility of reset button)
- `handleResetData`: Function to reset all data state
- `testingMode`: Boolean indicating if app is in testing mode
- `flowView`: String indicating current view mode ('none' or 'basic')
- `setFlowView`: Function to change the current view mode

**Implementation Notes**:
- Used exclusively in the TranscriptSummary page
- Styled with Tailwind CSS for consistent appearance
- Includes visual indicators for current active mode
- Uses React Icons for visual elements

**Example Usage**:
```jsx
<TranscriptHeader
  summaries={summaries}
  handleResetData={handleResetData}
  testingMode={testingMode}
  flowView={flowView}
  setFlowView={setFlowView}
/>
```

## Visualization Components

### BubbleChart

`BubbleChart` renders an interactive hierarchical bubble visualization of keywords.

**File Location**: `src/components/visualization/BubbleChart.jsx`

**Functionality**:
- Visualizes keyword relationships and frequencies as nested circles
- Supports interactive exploration with zoom and pan
- Handles selection and filtering of data points
- Adjusts to different screen sizes and data scales

**Props**:
- `data`: Hierarchical data structure for visualization
- `width`: Width of the chart container
- `height`: Height of the chart container
- `onBubbleClick`: Callback when a bubble is clicked
- `selectedKeyword`: Currently selected keyword for highlighting
- `colorScale`: Function to determine bubble colors based on data

### MapVisualization

`MapVisualization` provides a geographic representation of interview locations.

**File Location**: `src/components/visualization/MapVisualization.jsx`

**Functionality**:
- Renders an interactive map using Leaflet
- Displays markers for interview locations
- Supports filtering by region or keyword
- Provides popup information on marker click

**Props**:
- `data`: Array of location data with coordinates and metadata
- `selectedRegion`: Currently selected region for filtering
- `onMarkerClick`: Callback when a marker is clicked

### TimelineVisualization

`TimelineVisualization` displays interview content along a chronological timeline.

**File Location**: `src/components/visualization/TimelineVisualization.jsx`

**Functionality**:
- Renders events along a horizontal timeline
- Supports zooming and panning across time periods
- Groups related events visually
- Enables filtering by date ranges or keywords

**Props**:
- `events`: Array of timeline events with dates and metadata
- `selectedTimeRange`: Date range for filtering events
- `onEventClick`: Callback when an event is clicked

### MapComponent

`MapComponent` is a reusable map component with location marking.

**File Location**: `src/components/visualization/MapComponent.jsx`

**Functionality**:
- Provides core map rendering with Leaflet
- Supports custom markers and popups
- Manages zoom and pan interactions
- Handles map responsiveness

**Props**:
- `center`: Initial map center coordinates
- `zoom`: Initial zoom level
- `markers`: Array of location markers to display
- `onMarkerClick`: Callback when a marker is clicked

### VisualizationContainer

`VisualizationContainer` provides a standardized wrapper for visualization components.

**File Location**: `src/components/visualization/VisualizationContainer.jsx`

**Functionality**:
- Creates consistent layout and styling for visualizations
- Handles responsive sizing
- Provides common controls for visualization interaction

**Props**:
- `title`: Visualization title
- `children`: Visualization component to render
- `controls`: Optional toolbar controls

### VisualizationToolbar

`VisualizationToolbar` provides control buttons for visualizations.

**File Location**: `src/components/VisualizationToolbar.jsx`

**Functionality**:
- Renders a configurable toolbar for visualization controls
- Provides zoom, filter, and export actions
- Adapts layout to available space

**Props**:
- `onZoomIn`: Callback for zoom in action
- `onZoomOut`: Callback for zoom out action
- `onReset`: Callback for view reset
- `onExport`: Callback for exporting visualization
- `tools`: Array of custom tool configurations

## Node Components

### MetadataNode

`MetadataNode` displays and edits metadata in the flow diagram.

**File Location**: `src/components/nodes/MetadataNode.jsx`

**Functionality**:
- Displays interview and segment metadata
- Allows editing of metadata fields
- Connects to other nodes for data flow

**Props**:
- `data`: Node data including metadata
- `id`: Unique node identifier
- `selected`: Whether the node is selected

### TranscriptInputNode

`TranscriptInputNode` allows transcript data input in the flow diagram.

**File Location**: `src/components/nodes/input/TranscriptInputNode.jsx`

**Functionality**:
- Provides file upload for transcripts
- Supports text input for transcripts
- Validates input formats
- Passes data to connected nodes

### WhisperTranscriptionNode

`WhisperTranscriptionNode` handles audio transcription in the flow diagram.

**File Location**: `src/components/nodes/input/WhisperTranscriptionNode.jsx`

**Functionality**:
- Uploads audio files for transcription
- Configures transcription parameters
- Shows progress during processing
- Outputs transcription results

### PromptEditingNode

`PromptEditingNode` allows customization of LLM prompts in the flow diagram.

**File Location**: `src/components/nodes/processing/PromptEditingNode.jsx`

**Functionality**:
- Provides a prompt template editor
- Supports variable insertion
- Previews compiled prompts
- Passes prompts to LLM processing nodes

### ResultsDisplayNode

`ResultsDisplayNode` shows processing results in the flow diagram.

**File Location**: `src/components/nodes/output/ResultsDisplayNode.jsx`

**Functionality**:
- Displays formatted results from processing nodes
- Supports different view modes (table, tree, JSON)
- Enables result copying and export
- Shows processing metadata

### VideoPlayerNode

`VideoPlayerNode` embeds video playback in the flow diagram.

**File Location**: `src/components/nodes/media/VideoPlayerNode.jsx`

**Functionality**:
- Plays videos within the flow diagram
- Accepts video URLs or file uploads
- Provides playback controls
- Connects to transcript processing nodes

### KeywordBubbleNode

`KeywordBubbleNode` displays keyword visualizations in the flow diagram.

**File Location**: `src/components/nodes/visualization/KeywordBubbleNode.jsx`

**Functionality**:
- Renders interactive bubble charts within nodes
- Visualizes keyword frequencies and relationships
- Supports zoom and selection
- Connects to data processing nodes

### MapVisualizationNode

`MapVisualizationNode` renders geographic data in the flow diagram.

**File Location**: `src/components/nodes/visualization/MapVisualizationNode.jsx`

**Functionality**:
- Embeds interactive maps in flow diagram nodes
- Plots location data from connected nodes
- Supports filtering and selection
- Provides geospatial analysis tools

## Directory Components

### KeywordDirectory

`KeywordDirectory` provides a browsable directory of keywords from interviews.

**File Location**: `src/components/KeywordDirectory.jsx`

**Functionality**:
- Renders an alphabetically organized list of keywords
- Displays frequency and related interview count
- Supports searching and filtering
- Links keywords to related interview segments

**Props**:
- `keywords`: Array of keyword objects with metadata
- `onKeywordSelect`: Callback when a keyword is selected
- `selectedKeyword`: Currently selected keyword

### ClipsDirectory

`ClipsDirectory` provides a browsable directory of interview clips.

**File Location**: `src/components/ClipsDirectory.jsx`

**Functionality**:
- Lists available interview clips with metadata
- Supports filtering by interviewer, topic, and date
- Enables direct playback of clips
- Provides add-to-playlist functionality

**Props**:
- `clips`: Array of clip objects with metadata
- `onClipSelect`: Callback when a clip is selected
- `onAddToPlaylist`: Callback to add clip to current playlist

### RelatedClips

`RelatedClips` displays clips related to the current content.

**File Location**: `src/components/RelatedClips.jsx`

**Functionality**:
- Shows clips related by keyword, person, or topic
- Displays preview thumbnails and metadata
- Enables quick navigation to related content
- Supports horizontal scrolling for many items

**Props**:
- `currentClipId`: ID of the current clip
- `relatedClips`: Array of related clip objects
- `onClipSelect`: Callback when a clip is selected

### PeopleGrid

`PeopleGrid` displays a grid of people involved in interviews.

**File Location**: `src/components/PeopleGrid.jsx`

**Functionality**:
- Renders a responsive grid of people with photos
- Shows biographical information on hover/focus
- Supports filtering by role, era, or location
- Links to related interviews

**Props**:
- `people`: Array of people objects with metadata
- `onPersonSelect`: Callback when a person is selected
- `filters`: Filter criteria for display

## UI Components

### LoadingIndicator

`LoadingIndicator` provides visual feedback during data loading.

**File Location**: `src/components/LoadingIndicator.jsx`

**Functionality**:
- Shows animated loading indicator
- Supports different sizes and styles
- Optional loading message display
- Accessible to screen readers

**Props**:
- `size`: Size of the indicator (small, medium, large)
- `message`: Optional text message to display
- `type`: Style of indicator (spinner, bar, dots)

### ErrorDisplay

`ErrorDisplay` shows user-friendly error messages.

**File Location**: `src/components/ErrorDisplay.jsx`

**Functionality**:
- Displays formatted error messages
- Provides retry functionality when applicable
- Shows detailed error information (optional)
- Supports different severity levels

**Props**:
- `error`: Error object or message string
- `onRetry`: Optional callback for retry action
- `severity`: Error severity (info, warning, error)

### ConfirmationModal

`ConfirmationModal` requests user confirmation for actions.

**File Location**: `src/components/ConfirmationModel.jsx`

**Functionality**:
- Displays a modal dialog with confirmation message
- Provides confirm and cancel actions
- Supports keyboard navigation
- Prevents accidental actions

**Props**:
- `isOpen`: Controls modal visibility
- `onConfirm`: Callback when action is confirmed
- `onCancel`: Callback when action is cancelled
- `message`: Confirmation message to display
- `title`: Modal title

### ShuffleButton

`ShuffleButton` provides a toggle button for shuffle functionality.

**File Location**: `src/components/ShuffleButton.jsx`

**Functionality**:
- Toggles shuffle state with visual indication
- Animates state changes
- Accessible to keyboard and screen readers

**Props**:
- `shuffleEnabled`: Current shuffle state
- `onToggle`: Callback when shuffle state changes
- `size`: Button size

### UpNextBox

`UpNextBox` displays the next item in a playlist.

**File Location**: `src/components/UpNextBox.jsx`

**Functionality**:
- Shows preview of next content item
- Displays countdown timer to next item (optional)
- Provides skip and cancel controls
- Collapses when not needed

**Props**:
- `nextItem`: Object with data about the next item
- `autoplayEnabled`: Whether autoplay is enabled
- `timeUntilNext`: Seconds until autoplay (if enabled)
- `onSkip`: Callback to skip to next item immediately
- `onCancel`: Callback to cancel autoplay

### NodesToolbar

`NodesToolbar` provides controls for flow diagram editing.

**File Location**: `src/components/NodesToolbar.jsx`

**Functionality**:
- Provides tools for adding and connecting nodes
- Supports node arrangement and alignment
- Includes undo/redo functionality
- Offers node templates and presets

**Props**:
- `onAddNode`: Callback to add a new node
- `onConnect`: Callback to connect nodes
- `onDelete`: Callback to delete selected elements
- `onArrange`: Callback for automatic arrangement
- `selectedElements`: Currently selected elements

### AlignmentTools

`AlignmentTools` provides alignment controls for flow diagram elements.

**File Location**: `src/components/AlignmentTools.jsx`

**Functionality**:
- Offers horizontal and vertical alignment options
- Provides distribution controls
- Supports element grouping
- Shows keyboard shortcuts

**Props**:
- `onAlign`: Callback for alignment actions
- `onDistribute`: Callback for distribution actions
- `onGroup`: Callback for grouping actions
- `selectedElements`: Currently selected elements
- `disabled`: Whether the tools should be disabled

## Component Relationships

The components in this application follow these general relationship patterns:

1. **Page → Layout → Content Components**: All protected pages are wrapped in the Layout component, which provides the sidebar and consistent structure.

2. **Content Components → Specialized Components**: Page components use specialized components like VideoPlayer, visualization components, and directories to build their interfaces.

3. **Context Consumers**: Many components consume application contexts (Auth, Flow) to access shared state and functionality.

4. **Component Composition**: Complex interfaces are built by composing smaller, focused components rather than creating large monolithic components.

5. **Node System**: Flow diagram components follow a node-based architecture where specialized nodes can be connected to create processing workflows.

## Component Design Patterns

The application follows these design patterns for components:

1. **Container/Presentational Pattern**: Logic is separated from presentation where possible, with container components managing state and data fetching while presentational components focus on rendering.

2. **Custom Hooks for Logic**: Complex logic is extracted into custom hooks, keeping components cleaner and more focused on rendering.

3. **Prop Drilling Minimization**: Context API is used to avoid excessive prop drilling for global state like authentication.

4. **Controlled Components**: Form elements and interactive components are implemented as controlled components, with state managed at the appropriate level.

5. **Layout Components**: Consistent layout patterns are implemented through dedicated layout components rather than repeated in individual pages.

6. **Component Registration**: Flow diagram nodes are registered in a central registry, allowing for dynamic component discovery and instantiation.

## Component Styling

Components are styled using Tailwind CSS classes, which provides:

1. **Utility-First Approach**: Direct application of utility classes rather than custom CSS
2. **Responsive Design**: Built-in responsive classes for different screen sizes
3. **Consistent Design System**: Standardized spacing, colors, and typography
4. **Component-Specific Extensions**: Tailwind extensions for specialized component needs

## Performance Optimization Techniques

Components implement these performance optimizations:

1. **Memoization**: React.memo for expensive render operations
2. **Debounced Events**: Throttling of high-frequency events like scroll and resize
3. **Virtualization**: For long lists to minimize DOM elements
4. **Lazy Loading**: Components not needed for initial render are loaded on demand
5. **Optimized Re-renders**: Careful management of dependencies in useEffect hooks
6. **Progressive Loading**: Loading data in chunks for better perceived performance
7. **Web Workers**: Offloading heavy computations to background threads 