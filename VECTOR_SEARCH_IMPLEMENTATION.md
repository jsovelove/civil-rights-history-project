# Vector Search Implementation for Civil Rights History Project

This document outlines the implementation of the semantic (vector) search feature for the Civil Rights History Project. This feature allows users to search through interview clips based on conceptual meaning rather than just keyword matching.

You can see a live example of the [Semantic Search page here](https://jsovelove.github.io/civil-rights-history-project/#/semantic-search).

The core idea is to convert textual content (interview summaries/segments) and user queries into numerical representations called "embeddings" (vectors of floating-point numbers) using OpenAI's Vector Embedding API. These embeddings are then compared using cosine similarity to find the most relevant content. API calls for this feature are implemented as Google Cloud Functions (Firebase Functions v2) as a good security practice for managing API keys.

## Core Technologies

*   **OpenAI Embeddings API:** Utilizes the `text-embedding-3-small` model to generate vector embeddings for text.
*   **Firebase Cloud Functions (v2):** Securely handles server-side logic, including calls to the OpenAI API and interactions with Firestore. The OpenAI API key is managed as an environment variable in the Cloud Functions runtime.
*   **Firestore:** Stores the generated embeddings alongside references to the original content, and also stores the main content metadata (interview summaries, segments).
*   **Cosine Similarity:** A mathematical measure used to determine the similarity between the user's query embedding and the stored content embeddings.
*   **React:** Used for the front-end user interface.

## Part 1: Generating and Storing Embeddings (Indexing Content)

Before users can search, the textual content of the interviews must be processed into embeddings and stored.

### Overview

1.  Iterate through all relevant text content (interview summaries, segments).
2.  For each piece of text, call a Firebase Cloud Function (`exports.generateEmbedding`).
3.  This function calls the OpenAI API to get the embedding vector for the text.
4.  The embedding vector and associated metadata (like document ID, segment ID) are stored in a dedicated Firestore collection named `embeddings`.

### Cloud Function: `exports.generateEmbedding`

This Firebase Cloud Function is responsible for taking a piece of text, generating its embedding using OpenAI, and storing it in Firestore.

**Location:** `functions/index.js`

```javascript
// Simplified snippet from functions/index.js
const OpenAI = require("openai");
const functions = require("firebase-functions");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
// ... other imports and initializations ...

let openai;
let currentApiKey = "";

/**
 * Initializes or re-initializes the OpenAI client.
 * Ensures the API key is correctly sourced from environment variables.
 */
function initializeOpenAIClient() {
  // ... (logic to get OPENAI_API_KEY from process.env) ...
  // ... (initializes the `openai` client instance) ...
}
initializeOpenAIClient(); // Call on module load

// ...

exports.generateEmbedding = onCall({
  maxInstances: 10,
}, async (request) => {
  initializeOpenAIClient(); // Ensure client is up-to-date
  try {
    const {text, documentId, segmentId, textPreview} = request.data;
    if (!text) {
      // ... error handling ...
    }
    if (currentApiKey === "dummy_key_for_initialization") {
      // ... error handling for missing API key ...
    }

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    const embedding = embeddingResponse.data[0].embedding;

    const embeddingDoc = {
      embedding: embedding,
      documentId: documentId || null,
      segmentId: segmentId || null,
      textPreview: textPreview || text.substring(0, 200),
      createdAt: new Date(),
    };
    const docRef = await db.collection("embeddings").add(embeddingDoc);
    return {
      success: true,
      id: docRef.id,
    };
  } catch (error) {
    // ... error logging and handling ...
  }
});
```

### Triggering Embedding Generation (Client-Side Helper)

To process the entire database, a client-side utility function typically iterates through the content and calls the `exports.generateEmbedding` Cloud Function for each item. This is often part of an admin panel or a one-time script.

**Conceptual Location:** `src/services/embeddings.js` (function: `generateEmbeddingsForAllContent`)

The `generateEmbeddingsForAllContent` function (not shown in full here) would:
1.  Fetch all interview summaries and their segments from Firestore.
2.  For each relevant piece of text (e.g., a segment's summary combined with its topic and keywords), it would prepare the data.
3.  It then calls a helper function (like the older `generateAndStoreEmbeddings` which has now been superseded by direct calls to the Cloud Function, or directly calls the `exports.generateEmbedding` Cloud Function via `httpsCallable`).
    *Note: The current `generateAndStoreEmbeddings` in `src/services/embeddings.js` makes a direct `fetch` call to OpenAI. For a production system relying on Cloud Functions for all OpenAI interactions, this would be refactored to call `exports.generateEmbedding` instead.*

### Data Storage (`embeddings` Collection)

Embeddings are stored in a Firestore collection, typically named `embeddings`. Each document might look like:

```json
{
  "embedding": [0.0123, -0.0456, ..., 0.0789], // The actual vector
  "documentId": "interviewDocId123",
  "segmentId": "segmentIdABC", // Optional
  "textPreview": "A brief preview of the embedded text...",
  "createdAt": "2023-05-15T10:00:00.000Z"
}
```

## Part 2: Performing a Semantic Search

This describes the flow when a user types a query into the semantic search page.

### Overview

1.  User types a query in the search input on the `VectorSearchPage`.
2.  The page calls a service function, which in turn invokes the `exports.vectorSearch` Firebase Cloud Function.
3.  The Cloud Function converts the user's query into an embedding vector using OpenAI.
4.  It then fetches all stored embeddings from the `embeddings` Firestore collection.
5.  It compares the query embedding with each stored embedding using cosine similarity.
6.  Results are ranked by similarity, and the top matches are returned to the client.
7.  The client fetches detailed metadata for these results and displays them.

### 1. Front-End: Initiating Search (`VectorSearchPage.jsx`)

The user interacts with an input field. Submitting the form triggers the search.

**Location:** `src/pages/VectorSearchPage.jsx`

```javascript
// Simplified snippet from VectorSearchPage.jsx
import { vectorSearch as performClientVectorSearch } from '../services/embeddings'; // Renamed for clarity

export default function VectorSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  // ... other hooks and functions ...

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Call the client-side service function
      const searchResults = await performClientVectorSearch(searchQuery, 20); // Limit to 20 results
      const enhancedResults = await fetchResultMetadata(searchResults);
      setResults(enhancedResults);
    } catch (error) {
      console.error("Error during vector search:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // ... rest of the component ...
}
```

### 2. Front-End: Calling the Cloud Function (`src/services/embeddings.js`)

This service function acts as a bridge, using Firebase's `httpsCallable` to invoke the backend Cloud Function.

**Location:** `src/services/embeddings.js`

```javascript
// Simplified snippet from src/services/embeddings.js
import { getFunctions, httpsCallable } from "firebase/functions";

export async function vectorSearch(query, limit = 10) { // This is performClientVectorSearch in the above snippet
  if (!query || query.trim().length === 0) {
    throw new Error("Search query cannot be empty");
  }

  try {
    const functionsInstance = getFunctions(); 
    const searchFunction = httpsCallable(functionsInstance, 'vectorSearch');

    const result = await searchFunction({
      query: query.trim(),
      limit: Math.max(1, Math.min(50, limit)) // Ensure limit is reasonable
    });

    if (!result.data || !result.data.success) {
      throw new Error(result.data?.error || 'Vector search failed');
    }
    return result.data.results;
  } catch (error) {
    console.error('Error in client-side vectorSearch:', error);
    throw error;
  }
}
```

### 3. Cloud Function: `exports.vectorSearch`

This is the core backend logic for the search.

**Location:** `functions/index.js`

```javascript
// Simplified snippet from functions/index.js

// ... (initializeOpenAIClient, cosineSimilarity, etc. are defined above) ...

async function performVectorSearchQuery(queryEmbedding, limit = 10) {
  // Renamed from performVectorSearch to avoid conflict with client-side name
  const embeddingsSnapshot = await db.collection("embeddings").get();
  const results = [];
  embeddingsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.embedding) {
      const similarity = cosineSimilarity(queryEmbedding, data.embedding);
      results.push({
        id: doc.id,
        documentId: data.documentId,
        segmentId: data.segmentId,
        textPreview: data.textPreview,
        similarity,
      });
    }
  });
  return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
}

exports.vectorSearch = onCall({
  maxInstances: 10,
}, async (request) => {
  initializeOpenAIClient(); // Ensure client is up-to-date
  try {
    const {query, limit} = request.data;
    // ... (input validation) ...
    if (currentApiKey === "dummy_key_for_initialization") {
      // ... error handling for missing API key ...
    }

    const queryEmbeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

    const results = await performVectorSearchQuery(queryEmbedding, limit || 10);
    return {
      success: true,
      results,
    };
  } catch (error) {
    // ... error logging and handling ...
  }
});
```
**Key operations within `exports.vectorSearch`:**
*   **Gets Query Embedding:** Converts the user's text query into an embedding using `openai.embeddings.create()`.
*   **Compares Embeddings:** The `performVectorSearchQuery` helper function:
    *   Fetches all stored embeddings from Firestore.
    *   Calculates `cosineSimilarity` between the query embedding and each stored embedding.
*   **Returns Ranked Results:** Sorts results by similarity and returns the top matches.

### 4. Front-End: Displaying Results (`VectorSearchPage.jsx`)

Once the ranked results (containing IDs and similarity scores) are received, the front-end fetches the full details for each item to display them.

**Location:** `src/pages/VectorSearchPage.jsx` (function: `fetchResultMetadata`)

```javascript
// Simplified snippet from VectorSearchPage.jsx

const fetchResultMetadata = async (searchResultsFromCloudFunction) => {
  const enhancedResults = [];
  for (const result of searchResultsFromCloudFunction) {
    try {
      // Get interview document
      const interviewDoc = await getDoc(doc(db, "interviewSummaries", result.documentId));
      const interviewData = interviewDoc.data();
      
      // Get segment document if it exists
      let segmentData = null;
      if (result.segmentId) {
        const segmentDoc = await getDoc(doc(db, "interviewSummaries", result.documentId, "subSummaries", result.segmentId));
        segmentData = segmentDoc.data();
      }
      
      // Get thumbnail URL, etc.
      // ...
      
      enhancedResults.push({
        ...result, // Includes similarity, id, documentId, segmentId
        personName: interviewData.name || "Unknown",
        topic: segmentData?.topic || "Untitled Segment",
        summary: segmentData?.summary || result.textPreview, // Use segment summary or preview
        // ... other fields like keywords, thumbnailUrl
      });
    } catch (error) {
      // ... error handling ...
      enhancedResults.push(result); // Push result even if metadata fetch fails
    }
  }
  return enhancedResults;
};
```
This function enriches the raw search results with user-friendly information like names, topics, and full summaries before they are rendered on the page.

## Security and Best Practices

*   **API Key Management:** Using Firebase Cloud Functions to make OpenAI API calls is a crucial security measure. The OpenAI API key is stored as an environment variable in the Cloud Function's runtime environment, preventing its exposure on the client-side.
*   **Scalability:** Firebase Functions can scale automatically based on demand.
*   **Input Validation:** Both client-side and server-side validation should be present for inputs like search queries and limits.

This detailed breakdown should provide a good understanding of how vector search is implemented across your project. 