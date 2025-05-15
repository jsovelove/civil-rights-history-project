# Page Documentation

This document provides comprehensive documentation for all pages in the Civil Rights History Project application, including their functionality, component usage, state management, and routing.

## Overview

The application consists of the following main pages:

1. **Home**: Landing page with visualization tabs
2. **Login**: User authentication page 
3. **ContentDirectory**: Browse interface for keywords, clips, and people
4. **InterviewPlayer**: Full interview playback with chapter navigation
5. **ClipPlayer**: Individual clip playback with metadata
6. **PlaylistBuilder**: Interface for creating playlists from interview segments
7. **PlaylistEditor**: Interface for modifying existing playlists
8. **TranscriptSummary**: Tool for uploading and analyzing interview transcripts
9. **SearchPage**: Interface for keyword-based searches across interviews

## Page Details

### Home Page

**File Location**: `src/pages/Home.jsx`

**Purpose**: Serves as the landing page for the application, providing an overview and access to different visualization modes.

**Functionality**:
- Displays the application title and introduction
- Provides a tabbed interface for different data visualizations
- Allows users to switch between timeline, keyword, and map visualizations

**Components Used**:
- `VisualizationContainer`: Manages the visualization content based on active tab
- `Layout` (via route): Provides consistent page structure with navigation

**State Management**:
- Uses local state with `useState` to track the active visualization tab
- Consumes authentication context via `useAuth` hook

**Routing**:
- Path: `/` (root route)
- Protected by `ProtectedRoute`

### Login Page

**File Location**: `src/pages/Login.jsx`

**Purpose**: Provides user authentication functionality for accessing the application.

**Functionality**:
- Renders a login form with email and password fields
- Handles form validation and submission
- Displays appropriate error messages
- Redirects to the intended destination after successful login

**Components Used**:
- No additional components - self-contained form with styled elements

**State Management**:
- Uses local state to manage form inputs (email, password)
- Tracks loading state during authentication
- Manages error messages
- Uses authentication context via `useAuth` hook

**Routing**:
- Path: `/login`
- Public route (not protected)
- Captures intended destination via location state for post-login redirect

### ContentDirectory Page

**File Location**: `src/pages/ContentDirectory.jsx`

**Purpose**: Provides a browsable directory of interview content organized by keywords, clips, and people.

**Functionality**:
- Offers tabbed navigation between content types
- Displays content in sortable, filterable lists
- Provides detail views for selected items
- Enables navigation to related content

**Components Used**:
- `KeywordDirectory`: For browsing keywords
- `ClipsDirectory`: For browsing interview clips
- `PeopleGrid`: For browsing interview subjects
- `Layout` (via route): Provides consistent page structure with navigation

**State Management**:
- Uses local state to track active directory tab
- Manages selection state for detail views
- Uses Firestore data via custom hooks

**Routing**:
- Path: `/content-directory`
- Protected by `ProtectedRoute`

### InterviewPlayer Page

**File Location**: `src/pages/InterviewPlayer.jsx`

**Purpose**: Provides full interview playback with chapter-based navigation.

**Functionality**:
- Displays full interview video with custom player controls
- Shows interview metadata and transcript
- Provides chapter-based navigation
- Offers related content suggestions

**Components Used**:
- `VideoPlayer`: Handles YouTube video playback
- `PlayerControls`: Provides playback control interface
- `MetadataPanel`: Displays interview metadata
- `RelatedClips`: Shows related interview segments
- `Layout` (via route): Provides consistent page structure with navigation

**State Management**:
- Manages playback state (playing, paused, current time)
- Tracks current chapter/segment
- Loads interview data from Firestore
- Uses URL parameters to identify the interview

**Routing**:
- Path: `/interview-player`
- Protected by `ProtectedRoute`
- Accepts query parameters for interview ID

### ClipPlayer Page

**File Location**: `src/pages/ClipPlayer.jsx`

**Purpose**: Allows playback of individual interview clips with associated metadata.

**Functionality**:
- Plays specific interview segments
- Displays clip metadata and transcript
- Provides context within the larger interview
- Shows related clips and navigation options

**Components Used**:
- `VideoPlayer`: Handles YouTube video playback with clip boundaries
- `PlayerControls`: Provides playback control interface
- `MetadataPanel`: Displays clip metadata
- `RelatedClips`: Shows related interview segments
- `Layout` (via route): Provides consistent page structure with navigation

**State Management**:
- Manages clip playback state
- Loads clip data from Firestore
- Uses URL parameters to identify the clip

**Routing**:
- Path: `/clip-player`
- Protected by `ProtectedRoute`
- Accepts query parameters for clip ID

### PlaylistBuilder Page

**File Location**: `src/pages/PlaylistBuilder.jsx`

**Purpose**: Enables users to create and manage playlists of interview segments.

**Functionality**:
- Searches for clips by keyword, person, or topic
- Allows adding clips to playlists
- Supports arranging clip order via drag and drop
- Provides playlist preview and playback
- Enables saving and sharing playlists

**Components Used**:
- `VideoPlayer`: Handles YouTube video playback
- `ClipsDirectory`: For browsing and selecting clips
- `KeywordDirectory`: For finding clips by keyword
- `RelatedClips`: Shows related interview segments
- `DragDropContext`: Manages drag and drop functionality
- `Layout` (via route): Provides consistent page structure with navigation

**State Management**:
- Manages playlist items and order
- Handles search queries and results
- Tracks current playback position within playlist
- Persists playlists to Firestore

**Routing**:
- Path: `/playlist-builder`
- Protected by `ProtectedRoute`
- Accepts optional query parameters for initial keywords or clips

### PlaylistEditor Page

**File Location**: `src/pages/PlaylistEditor.jsx`

**Purpose**: Allows modification of existing playlists.

**Functionality**:
- Edits playlist metadata (title, description)
- Reorders clips via drag and drop
- Removes clips from playlist
- Provides playlist preview and playback
- Saves changes to existing playlists

**Components Used**:
- `VideoPlayer`: Handles YouTube video playback
- `PlayerControls`: Provides playback control interface
- `DragDropContext`: Manages drag and drop functionality
- `ShuffleButton`: Toggles playlist shuffle mode
- `Layout` (via route): Provides consistent page structure with navigation

**State Management**:
- Loads existing playlist from Firestore
- Manages playlist editing state
- Tracks changes and persists to database
- Handles playback state for preview

**Routing**:
- Path: `/playlist-editor`
- Protected by `ProtectedRoute`
- Requires playlist ID as a query parameter

### TranscriptSummary Page

**File Location**: `src/pages/TranscriptSummary.jsx`

**Purpose**: Provides tools for uploading and analyzing interview transcripts using LLMs.

**Functionality**:
- Allows transcript upload and processing
- Supports YouTube URL input for processing
- Uses OpenAI API for summary generation
- Displays structured summaries with key points
- Provides visual node-based workflow for customization
- Enables saving results to the database

**Components Used**:
- `TranscriptHeader`: Displays application controls and mode switching
- `VideoPanel`: Shows video associated with transcript
- `ReactFlow`: Manages node-based workflow interface
- Various node components:
  - `TranscriptInputNode`: For file upload and text input
  - `PromptEditingNode`: For customizing LLM prompts
  - `ResultsDisplayNode`: For viewing processing results
- `LoadingIndicator`: Shows processing status
- `ErrorDisplay`: Shows error messages
- `Layout` (via route): Provides consistent page structure with navigation

**State Management**:
- Manages complex workflow state with multiple input types
- Handles API requests to OpenAI
- Tracks processing status and results
- Manages flow diagram state with nodes and edges
- Persists results to Firestore

**Routing**:
- Path: `/transcript-summary`
- Protected by `ProtectedRoute`

### SearchPage

**File Location**: `src/pages/SearchPage.jsx`

**Purpose**: Provides keyword-based search functionality across all interviews.

**Functionality**:
- Offers search input with suggestions
- Displays search results grouped by relevance
- Provides filters for narrowing results
- Allows direct navigation to clips and interviews
- Shows contextual snippet previews

**Components Used**:
- `SearchBar`: Input field with search controls
- `ClipsDirectory`: For displaying search results
- `KeywordDirectory`: For related keyword suggestions
- `LoadingIndicator`: Shows search progress
- `Layout` (via route): Provides consistent page structure with navigation

**State Management**:
- Manages search query and filters
- Handles search execution and result pagination
- Tracks selected result for detail view
- Uses Firestore queries for search implementation

**Routing**:
- Path: `/search`
- Protected by `ProtectedRoute`
- Accepts query parameters for initial search terms

## Page Relationships

The application follows these general page relationship patterns:

1. **Navigation Flow**: Home → ContentDirectory → InterviewPlayer/ClipPlayer
2. **Content Creation Flow**: TranscriptSummary → ContentDirectory → PlaylistBuilder
3. **Content Consumption Flow**: SearchPage → ClipPlayer → InterviewPlayer
4. **Playlist Management Flow**: PlaylistBuilder → PlaylistEditor → ClipPlayer

## Authentication Integration

All pages except Login are wrapped with the `ProtectedRoute` component, which:
- Checks user authentication status via AuthContext
- Redirects unauthenticated users to the Login page
- Preserves the intended destination for post-login redirect
- Ensures secure access to application features

## Responsive Design

All pages implement responsive designs that adapt to different screen sizes:
- Desktop: Full featured with multi-column layouts
- Tablet: Adapted layouts with prioritized content
- Mobile: Simplified single-column layouts with touch-friendly controls

## Error Handling

Pages implement consistent error handling patterns:
- Form validation with informative error messages
- API error handling with retry options
- Network error detection and recovery
- User-friendly error displays via ErrorDisplay component 