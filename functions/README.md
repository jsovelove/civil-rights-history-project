# OpenAI Vector Search Firebase Cloud Functions

This directory contains Firebase Cloud Functions for implementing vector search using OpenAI's embeddings API.

## Setup Instructions

1. Install dependencies:
```bash
cd functions
npm install
```

2. Set up your OpenAI API key:

For production deployment:
```bash
firebase functions:config:set openai.api_key="your_openai_api_key_here"
```

For local development and testing:
```bash
# Windows PowerShell
$env:OPENAI_API_KEY="your_openai_api_key_here"

# Windows CMD
set OPENAI_API_KEY=your_openai_api_key_here

# macOS/Linux
export OPENAI_API_KEY=your_openai_api_key_here
```

To use Firebase config values locally, you can also run:
```bash
firebase functions:config:get > .runtimeconfig.json
```

3. Deploy functions:
```bash
firebase deploy --only functions
```

## Available Functions

### `generateEmbedding`

Generates an embedding for text content and stores it in Firestore. This function takes the following parameters:

- `text` (required): The text to generate an embedding for
- `documentId`: Associated document ID (optional)
- `segmentId`: Associated segment ID (optional) 
- `textPreview`: Text preview to store with the embedding (optional, defaults to first 200 characters)

### `vectorSearch`

Performs vector search using OpenAI embeddings. This function takes the following parameters:

- `query` (required): The search query
- `limit`: Maximum number of results to return (default: 10)

## Usage in Client Code

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

// Call the vector search function
const functions = getFunctions();
const searchFunction = httpsCallable(functions, 'vectorSearch');

// Perform search
const result = await searchFunction({
  query: "Your search query here",
  limit: 20
});

// Get results
const searchResults = result.data.results;
```

## Storage Structure

The functions use a Firestore collection called `embeddings` to store vector embeddings. Each document in this collection has the following structure:

```
{
  embedding: Float32Array,      // The vector embedding
  documentId: string,           // Associated document ID
  segmentId: string,            // Associated segment ID (optional)
  textPreview: string,          // Preview of the embedded text
  createdAt: timestamp          // When the embedding was created
}
``` 