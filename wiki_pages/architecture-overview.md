# Architecture Overview

This document provides a high-level overview of the Civil Rights History Project application architecture, explaining the key components, their relationships, and the data flow throughout the system.

## System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                         React Frontend                         │
├───────────┬───────────────────────────────────┬───────────────┤
│  Context  │            Components             │     Pages     │
│  Providers│                                   │               │
├───────────┤ ┌─────────────┐ ┌─────────────┐  │ ┌───────────┐ │
│           │ │   Common    │ │Visualization│  │ │   Home    │ │
│ AuthContext│ │ Components │ │ Components  │  │ │           │ │
│           │ └─────────────┘ └─────────────┘  │ └───────────┘ │
├───────────┤ ┌─────────────┐ ┌─────────────┐  │ ┌───────────┐ │
│           │ │    Auth     │ │    Video    │  │ │   Login   │ │
│FlowContext│ │ Components  │ │ Components  │  │ │           │ │
│           │ └─────────────┘ └─────────────┘  │ └───────────┘ │
└───────────┴───────────────────────────────────┴───────────────┘
       │                     │                        │
       ▼                     ▼                        ▼
┌──────────────┐     ┌──────────────┐      ┌──────────────────┐
│  Firebase    │     │   YouTube    │      │     OpenAI       │
│  Services    │     │   API        │      │     API          │
└──────────────┘     └──────────────┘      └──────────────────┘
       │                                           │
       │                                           │
       ▼                                           ▼
┌──────────────┐                         ┌──────────────────┐
│  Firestore   │                         │  LLM-Powered     │
│  Database    │                         │  Text Processing │
└──────────────┘                         └──────────────────┘
```

## Core Architecture Components

### 1. Frontend Layer

The application is built with React 18+ and follows a component-based architecture with functional components and hooks.

#### Key Frontend Components:

- **Context Providers**
  - `AuthContext`: Manages user authentication state and provides login/logout functionality
  - `FlowContext`: Manages the state and layout of the flow diagram visualizations

- **Component Categories**
  - **Auth Components**: Handle user authentication and protected routes
  - **Common Components**: Shared UI elements like Layout, Sidebar, and navigation
  - **Video Components**: Handle video playback with segment navigation
  - **Visualization Components**: Provide interactive data visualizations
  - **Node Components**: Used in flow diagrams and interactive visualizations

- **Pages**
  - `Home`: Dashboard with overview of available features
  - `Login`: User authentication
  - `PlaylistBuilder`: Interface for creating playlists from interview segments
  - `PlaylistEditor`: Interface for modifying existing playlists
  - `TranscriptSummary`: Tool for uploading and analyzing interview transcripts
  - `SearchPage`: Interface for keyword-based searches across interviews
  - `InterviewPlayer`: Full interview playback with chapter navigation
  - `ClipPlayer`: Individual clip playback with metadata
  - `ContentDirectory`: Browse interface for keywords, clips, and people

### 2. Backend Services

The application integrates with several external services:

- **Firebase**: Provides authentication and database services
  - Authentication: User login/registration management
  - Firestore: NoSQL database storing interview metadata, transcripts, and user data

- **YouTube API**: Powers video playback functionalities with:
  - IFrame API for embedding videos
  - Timestamp-based navigation
  - Playlist management

- **OpenAI API**: Provides LLM-based text processing:
  - Transcript summarization
  - Keyword extraction
  - Metadata generation

### 3. Custom Hooks

The application uses several custom hooks to encapsulate and reuse complex logic:

- `useTranscriptData`: Manages transcript processing and analysis
- `useFlowLayout`: Controls the layout and behavior of flow diagrams
- `useDragAndDrop` & `useNodeDragAndDrop`: Manage drag-and-drop functionality
- `useLocalStorage`: Provides persistent local storage capabilities

## Data Flow

1. **Authentication Flow**:
   - User credentials flow through the AuthContext to Firebase Authentication
   - Auth state changes trigger UI updates via React Context

2. **Content Retrieval Flow**:
   - Interview data is retrieved from Firestore via Firebase services
   - Structured data is passed to React components for display
   - Media content is served via YouTube integrations

3. **Transcript Processing Flow**:
   - Raw transcripts are uploaded by users
   - OpenAI API processes text to extract summaries, keywords, and segments
   - Processed data is stored in Firestore and made available for search/display

4. **Visualization Data Flow**:
   - Aggregated data from Firestore powers interactive visualizations
   - User interactions with visualizations trigger filtered content display

## Deployment Architecture

The application is built with Vite and deployed as a static site on GitHub Pages. The frontend communicates with Firebase and other external APIs directly from the client browser.

## State Management

The application uses React Context API for global state management, with local component state for UI-specific concerns. Main contexts include:

- `AuthContext`: User authentication state
- `FlowContext`: Flow diagram visualization state

## Key Dependencies

- **UI Framework**: React with Tailwind CSS
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Visualization**: d3.js, Visx, Recharts, Leaflet
- **External APIs**: Firebase, YouTube, OpenAI
- **Build Tool**: Vite

## Performance Considerations

- LLM processing is done on-demand to minimize API costs
- Firebase queries are optimized to fetch only necessary data
- UI components implement lazy loading where appropriate
- Media assets are served via external providers (YouTube) to reduce hosting costs 