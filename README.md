# Civil Rights History Project

A React-based web application powered by Large Language Models (LLMs) for analyzing, exploring, and creating playlists from civil rights oral history interviews: https://www.loc.gov/collections/civil-rights-history-project

## Overview

This project provides a dynamic interface for users to engage with oral history interviews from the Civil Rights Movement. The platform leverages LLMs to automatically process interview transcripts, extracting structured metadata including summaries, timestamps, and keywords. These AI-generated insights power the application's features for keyword-based searching, playlist creation, transcript summarization, and visualizations that help users explore connections between different interviews and topics.

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
## Technologies Used

- **Frontend**: React, React Router, Tailwind CSS
- **State Management**: React Context API
- **Backend & Authentication**: Firebase (Firestore, Authentication)
- **Video Integration**: YouTube IFrame API
- **Visualizations**: d3.js, Visx, Recharts, Leaflet
- **External APIs**: OpenAI API (for transcript summarization)
- **Build Tools**: Vite

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

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

## Key Components

### `PlaylistBuilder`

Allows users to search for and play interviews based on keywords. Creates playlists of interview segments and provides an interactive timeline for navigation.

### `IntegratedTimeline`

Displays a visual timeline of video segments with thumbnails and timestamps, allowing users to see the current position and navigate through the playlist.

### `InterviewPlayer`

Plays specific interviews with a responsive YouTube player and displays an accordion of timestamped segments.

### `BubbleChart`

Visualizes keywords as interactive bubbles, with size indicating frequency across all interviews.

### `MapVisualization`

Shows the birthplaces of interview subjects on an interactive map using Leaflet.

### `TranscriptSummary`

Allows users to upload interview transcripts for AI-powered summarization using the OpenAI API.
