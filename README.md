# Civil Rights History Project

A React-based web application powered by Large Language Models (LLMs) for analyzing, exploring, and creating playlists from civil rights oral history interviews: https://www.loc.gov/collections/civil-rights-history-project

## Overview

This project provides a dynamic interface for users to engage with oral history interviews from the Civil Rights Movement. The platform leverages LLMs to automatically process interview transcripts, extracting structured metadata including summaries, timestamps, and keywords. These AI-generated insights power the application's features for keyword-based searching, playlist creation, transcript summarization, and visualizations that help users explore connections between different interviews and topics.

## Technical Documentation
https://github.com/jsovelove/civil-rights-history-project/wiki

## Project Structure

```
/src
  /components       # Reusable UI components
    /auth           # Authentication components
    /common         # Shared components (Layout, Sidebar, etc.)
    /visualization  # Data visualization components
  /contexts         # React Context providers
  /pages            # Application pages/routes
  /services         # Firebase and external API services
  /styles           # Global CSS styles
  /utils            # Utility functions
  App.jsx           # Main application component
  main.jsx          # Entry point
```
## Key Features

- **Keyword-based Search**: Find relevant interview segments across the entire collection
- **Semantic Search**: Search for concepts and meaning, not just exact keywords
- **Dynamic Playlists**: Dynamic creation of playlists of interview segments based on keywords
- **Interactive Visualizations**: Explore connections between topics, people, and places
- **Timeline Navigation**: Navigate interviews with timestamps and segment navigation
- **Transcript Summarization**: Automatically generate summaries of interview transcripts
- **Metadata Editing**: Edit and enhance AI-generated metadata for better organization
  
## Core Components

- **PlaylistBuilder**: Create and play themed playlists from keyword-based searches
- **InterviewPlayer**: Play full interviews with chapter-based navigation
- **ClipPlayer**: Play individual interview segments
- **ContentDirectory**: Browse keywords, clips, and people
- **Visualizations**: Keyword bubble chart, geographic map, and timeline visualizations
- **TranscriptSummary**: Upload and automatically summarize interview transcripts
- **VectorSearchPage**: Find conceptually similar content using semantic search

## Technologies Used

- **Frontend**:
  - React 18+ with functional components and hooks
  - React Router v6 for navigation
  - Tailwind CSS for styling
  - Lucide React for icons

- **State Management**:
  - React Context API for application state
  - Custom hook patterns for shared logic

- **Backend & Authentication**:
  - Firebase Firestore for database
  - Firebase Authentication for user management

- **AI & Vector Search**:
  - OpenAI Embeddings API for generating vector embeddings
  - Vector similarity search for semantic content discovery

- **Video Integration**:
  - YouTube IFrame API for video playback
  - Custom video player with segment navigation

- **Visualizations**:
  - d3.js for data visualization core functionality
  - Visx for React-based visualizations
  - Recharts for charting components
  - Leaflet for map-based visualizations

- **External APIs**:
  - OpenAI API (GPT-4o-mini) for transcript summarization

- **Build Tools**:
  - Vite for fast development and optimized builds

## Getting Started


### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

  ### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/civil-rights-history-project.git
   cd civil-rights-history-project
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Create an `.env` file in the root directory with the following content:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser
   
## Semantic Search Implementation

The application includes a semantic search capability powered by vector embeddings:

1. **Embeddings Generation**: Text from interview content is converted to vector embeddings using OpenAI's Embeddings API
2. **Vector Storage**: Embeddings are stored in Firestore alongside the original text
3. **Similarity Calculation**: When a user performs a semantic search, their query is converted to a vector and compared against stored embeddings
4. **Results Ranking**: Results are ranked by cosine similarity, showing the most conceptually similar content first

To initialize embeddings:
1. Navigate to the Embeddings Admin page
2. Click "Generate Embeddings" to process all content
3. Once complete, the semantic search feature will be fully functional

## Firebase Data Structure

The application uses the following Firestore collections:

- **interviewSummaries**: Main documents containing interview metadata
  - **subSummaries** (subcollection): Individual interview segments with timestamps
- **keywordSummaries**: Aggregated information about keywords across interviews
- **timelineEvents**: Historical events linked to interview content
- **embeddings**: Vector embeddings for semantic search functionality

## Acknowledgments

- [Library of Congress Civil Rights History Project](https://www.loc.gov/collections/civil-rights-history-project) for the original interview content
- OpenAI for the GPT models used in transcript summarization

