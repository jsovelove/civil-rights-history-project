# Utility Functions Documentation

This document provides comprehensive documentation for utility functions used throughout the Civil Rights History Project application.

## Overview

The application is organized into several utility modules, each serving a specific purpose:

| Module | Purpose |
|--------|---------|
| `transcriptUtils.js` | Functions for processing and analyzing interview transcripts |
| `nodeUtils.js` | Utilities for creating and managing nodes in the flow-based interface |
| `flowUtils.js` | Functions for React Flow configuration and management |
| `edgeUtils.js` | Utilities for creating and styling edges between nodes |
| `timeUtils.js` | Timestamp parsing, formatting, and conversion utilities |
| `simulatedTranscriptUtils.js` | Utilities for simulating transcript processing (development only) |

## Transcript Utilities

The `transcriptUtils.js` module contains functions for processing interview transcripts.

### File and Text Processing

```javascript
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};
```

Reads a file as text using the browser's FileReader API.

### OpenAI API Integration

```javascript
export const getSummariesFromChatGPT = async (transcript, systemMessage, model = "gpt-4o-mini", retries = 3, delay = 2000) => {
  // Implementation details...
};
```

Sends transcript text to OpenAI API for analysis and summary generation:
- Parameters include the transcript, system message for prompt context, model choice, and retry options
- Handles rate limiting with exponential backoff
- Returns structured data parsed from the API response

```javascript
export const parseGPTResponse = (response) => {
  // Implementation details...
};
```

Parses the raw text response from OpenAI API into a structured format with:
- Overall summary
- Key points with timestamps and keywords

### Timestamp Handling

```javascript
export const parseTimestamp = (timestamp) => {
  // Implementation details...
};
```

Parses timestamps in various formats (MM:SS, HH:MM:SS, or ranges) into seconds.

### Firebase Integration

```javascript
export const saveProcessedTranscript = async (documentName, summaries, db) => {
  // Implementation details...
};
```

Saves processed transcript data to Firebase Firestore, including:
- Main document with overall summary
- Subcollection of key points with timestamps and keywords

### Audio Transcription

```javascript
export const transcribeAudioWithWhisper = async (audioFile, language = null, retries = 3, delay = 2000) => {
  // Implementation details...
};
```

Transcribes audio files using OpenAI's Whisper API:
- Handles audio file uploads
- Optional language specification
- Includes retry mechanism for API failures

## Node Utilities

The `nodeUtils.js` module provides utilities for creating and configuring nodes in the flow-based interface.

### Node Creation

```javascript
export const createNodeFromType = (type, position, label, extraData = {}) => {
  // Implementation details...
};
```

Creates a new node with appropriate defaults based on node type, including:
- Unique ID generation
- Type-specific styling (width, height)
- Data merging with defaults

### Edge Creation

```javascript
export const createEdge = (sourceId, targetId, sourceHandle, targetHandle) => {
  // Implementation details...
};
```

Creates a new edge between two nodes with styling.

### Connection Validation

```javascript
export const isValidConnection = (connection, nodes) => {
  // Implementation details...
};
```

Determines if a connection between nodes is valid.

### Node Configuration

```javascript
export const getNodeConfig = (type, props = {}) => {
  // Implementation details...
};
```

Provides default configuration for specific node types, including:
- TranscriptInput
- WhisperTranscription
- PromptEditing
- ResultsDisplay
- VideoPlayer
- Metadata

## Flow Utilities

The `flowUtils.js` module contains utilities for managing the React Flow interface.

### Default Configuration

```javascript
export const getDefaultNodes = (column1X, column2X, row1Y, row2Y, nodeWidth, props) => [
  // Implementation details...
];
```

Provides default node configuration for the transcript processing flow.

```javascript
export const getDefaultEdges = () => [
  // Implementation details...
];
```

Provides default edge configuration connecting the default nodes.

### Edge Type Configuration

```javascript
export const getEdgeTypes = (edgeComponents) => {
  // Implementation details...
};
```

Configures edge types for React Flow (bezier, straight, step).

### Node Connection

```javascript
export const connectNodes = (params, setEdges) => {
  // Implementation details...
};
```

Connects nodes with an edge, applying default styling.

### Node Alignment and Distribution

```javascript
export const alignNodesHorizontally = (selectedNodes, setNodes) => {
  // Implementation details...
};

export const alignNodesVertically = (selectedNodes, setNodes) => {
  // Implementation details...
};

export const distributeNodesHorizontally = (selectedNodes, setNodes) => {
  // Implementation details...
};

export const distributeNodesVertically = (selectedNodes, setNodes) => {
  // Implementation details...
};
```

Functions for aligning and distributing selected nodes in the flow.

### Edge Styling

```javascript
export const makeEdgesOrthogonal = (nodes, setEdges) => {
  // Implementation details...
};
```

Converts edges to orthogonal paths for a cleaner flow layout.

## Time Utilities

The `timeUtils.js` module provides functions for handling timestamps and time formatting.

### Timestamp Parsing

```javascript
export function parseKeywords(input) {
  // Implementation details...
}
```

Parses a comma-separated string of keywords into an array.

```javascript
export function extractVideoId(videoEmbedLink) {
  // Implementation details...
}
```

Extracts YouTube video ID from an embed link.

```javascript
export function extractStartTimestamp(rawTimestamp) {
  // Implementation details...
}
```

Extracts a timestamp from a formatted string, handling brackets and other formatting.

```javascript
export function convertTimestampToSeconds(timestamp) {
  // Implementation details...
}
```

Converts a timestamp string (MM:SS or HH:MM:SS) to seconds.

### Time Formatting

```javascript
export function formatTime(seconds) {
  // Implementation details...
}
```

Formats seconds as a timestamp string (MM:SS or HH:MM:SS).

### Timestamp Range Handling

```javascript
export function getTotalPlaylistDuration(videoQueue) {
  // Implementation details...
}
```

Calculates the total duration of all videos in a playlist.

```javascript
export function createTimestampRange(startSeconds, endSeconds) {
  // Implementation details...
}
```

Creates a formatted timestamp range from start and end seconds.

```javascript
export function parseTimestampRange(timestampRange) {
  // Implementation details...
}
```

Parses a timestamp range (e.g., "1:20 - 2:45") into an object with start and end seconds.

## Usage Examples

### Processing a Transcript

```javascript
import { readFileAsText, getSummariesFromChatGPT, saveProcessedTranscript } from './utils/transcriptUtils';

async function processTranscriptFile(file, systemMessage, db) {
  // Read the file
  const transcriptText = await readFileAsText(file);
  
  // Process with OpenAI
  const summaries = await getSummariesFromChatGPT(transcriptText, systemMessage);
  
  // Save to Firestore
  await saveProcessedTranscript(`Interview-${Date.now()}`, summaries, db);
  
  return summaries;
}
```

### Creating a Custom Flow

```javascript
import { createNodeFromType, createEdge } from './utils/nodeUtils';
import { connectNodes } from './utils/flowUtils';

function createCustomFlow(setNodes, setEdges) {
  // Create input node
  const inputNode = createNodeFromType('transcriptInput', { x: 100, y: 100 }, 'Input Node');
  
  // Create processing node
  const processingNode = createNodeFromType('promptEditing', { x: 100, y: 300 }, 'Process Node');
  
  // Create output node
  const outputNode = createNodeFromType('resultsDisplay', { x: 400, y: 200 }, 'Results Node');
  
  // Set nodes
  setNodes([inputNode, processingNode, outputNode]);
  
  // Connect nodes
  const edge1 = createEdge(inputNode.id, processingNode.id);
  const edge2 = createEdge(processingNode.id, outputNode.id);
  
  // Set edges
  setEdges([edge1, edge2]);
}
```

### Working with Timestamps

```javascript
import { convertTimestampToSeconds, formatTime, createTimestampRange } from './utils/timeUtils';

function jumpToTimestamp(player, timestamp) {
  // Convert timestamp to seconds
  const seconds = convertTimestampToSeconds(timestamp);
  
  // Seek to position
  player.seekTo(seconds);
}

function displayClipDuration(startTime, endTime) {
  // Convert to seconds
  const startSeconds = convertTimestampToSeconds(startTime);
  const endSeconds = convertTimestampToSeconds(endTime);
  
  // Calculate duration
  const durationSeconds = endSeconds - startSeconds;
  
  // Format as readable time
  return formatTime(durationSeconds);
}

function createClipRange(start, end) {
  return createTimestampRange(start, end);
}
```

## Best Practices

1. **Error Handling**: Always use try/catch blocks when working with asynchronous utility functions, especially API calls.

2. **Default Parameters**: Provide sensible defaults for optional parameters to make functions more flexible.

3. **Type Checking**: Add validation for input parameters to prevent runtime errors.

4. **Documentation**: Keep JSDoc comments up-to-date to maintain code readability.

5. **Modularity**: Create new utility functions rather than extending existing ones with unrelated functionality.

## Related Documentation

- [OpenAI Integration](openai-integration): How transcript processing utilities integrate with OpenAI
- [Node System Documentation](node-system): How node utilities support the flow-based interface
- [Firebase Integration](firebase-integration): How storage utilities interact with Firestore
- [Component Documentation](component-documentation): How components utilize these utility functions 