# Firebase Integration

This document provides comprehensive documentation for the Firebase integration in the Civil Rights History Project application, covering authentication, database structure, and data access patterns.

## Overview

The application uses Firebase to provide:

1. **Authentication**: User management with email/password login
2. **Firestore Database**: NoSQL database for storing interview metadata, transcripts, and user data
3. **Security Rules**: Access control for database operations

## Firebase Setup

The Firebase configuration is initialized in `src/services/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "...",
  authDomain: "llm-hyper-audio.firebaseapp.com",
  projectId: "llm-hyper-audio",
  storageBucket: "llm-hyper-audio.firebasestorage.app",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
```

This module exports:
- `db`: The Firestore database instance
- `auth`: The Firebase Auth instance

## Authentication

### Authentication Context

The application uses a custom React Context (`AuthContext`) to manage authentication state and provide authentication functions throughout the application.

**File Location**: `src/contexts/AuthContext.jsx`

### Key Authentication Features:

- Email/password authentication
- Persistent sessions across page reloads
- Protected routes using the `ProtectedRoute` component
- Authentication state management

### Usage Example:

```jsx
import { useAuth } from '../contexts/AuthContext';

function ProfileComponent() {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### Authentication Flow:

1. **Initial Load**: `AuthProvider` sets up a listener for authentication state changes
2. **Login Request**: User provides credentials via the Login component
3. **Authentication**: Credentials are verified by Firebase Auth
4. **State Update**: On successful authentication, the AuthContext updates with user information
5. **Protected Access**: Authenticated users can access protected routes

## Firestore Database

### Data Model

The application uses the following Firestore collections:

#### 1. `interviewSummaries`

Stores processed interview data including metadata and segment information.

**Fields**:
- `id`: Unique identifier (document ID)
- `title`: Interview title
- `interviewer`: Name of the interviewer
- `interviewee`: Name of the person being interviewed
- `date`: Interview date 
- `location`: Where the interview was conducted
- `summary`: Overall interview summary
- `keywords`: Array of relevant keywords
- `youtubeUrl`: Link to the YouTube video
- `timestamp`: Processing timestamp
- `processedBy`: User who uploaded/processed the transcript

**Subcollections**:
- `subSummaries`: Individual segments of the interview with timestamps

#### 2. `keywordSummaries`

Aggregated information about keywords across all interviews.

**Fields**:
- `id`: Keyword (used as document ID)
- `count`: Number of occurrences across all interviews
- `interviews`: Array of interview IDs where the keyword appears
- `importance`: Calculated importance score

#### 3. `playlists`

User-created collections of interview segments.

**Fields**:
- `id`: Unique identifier (document ID)
- `title`: Playlist title
- `description`: Playlist description
- `createdBy`: User who created the playlist
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `clips`: Array of clip references with order information

#### 4. `users`

User profiles and preferences.

**Fields**:
- `id`: User ID (matches Firebase Auth UID)
- `email`: User email
- `displayName`: User's display name
- `role`: User role (admin, editor, viewer)
- `lastLogin`: Last login timestamp
- `preferences`: User preference settings

### Data Access Patterns

The application uses the following data access patterns:

#### 1. Direct Document Retrieval

Used when the exact document ID is known.

```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

async function getInterview(interviewId) {
  const docRef = doc(db, 'interviewSummaries', interviewId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  } else {
    return null;
  }
}
```

#### 2. Collection Queries

Used to retrieve multiple documents with filtering, sorting, and pagination.

```javascript
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

async function getInterviewsByKeyword(keyword, limitCount = 10) {
  const q = query(
    collection(db, 'interviewSummaries'),
    where('keywords', 'array-contains', keyword),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

#### 3. Subcollection Access

Used to access nested collections within documents.

```javascript
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

async function getInterviewSegments(interviewId) {
  const segmentsRef = collection(db, 'interviewSummaries', interviewId, 'subSummaries');
  const q = query(segmentsRef, orderBy('startTime'));
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

#### 4. Real-time Updates

Used to listen for changes and update the UI automatically.

```javascript
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useState, useEffect } from 'react';

function useInterviewData(interviewId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!interviewId) {
      setLoading(false);
      return;
    }
    
    const docRef = doc(db, 'interviewSummaries', interviewId);
    const unsubscribe = onSnapshot(docRef, 
      (doc) => {
        if (doc.exists()) {
          setData({ id: doc.id, ...doc.data() });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error getting document:", err);
        setError(err);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [interviewId]);
  
  return { data, loading, error };
}
```

## Data Operations

### Creating Documents

```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

async function saveTranscriptSummary(summaryData) {
  try {
    const docRef = await addDoc(collection(db, 'interviewSummaries'), {
      ...summaryData,
      timestamp: serverTimestamp(),
      processedBy: auth.currentUser.uid
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding document:", error);
    throw error;
  }
}
```

### Updating Documents

```javascript
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

async function updateInterviewMetadata(interviewId, metadata) {
  try {
    const docRef = doc(db, 'interviewSummaries', interviewId);
    await updateDoc(docRef, {
      ...metadata,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error updating document:", error);
    throw error;
  }
}
```

### Deleting Documents

```javascript
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

async function deleteInterview(interviewId) {
  try {
    await deleteDoc(doc(db, 'interviewSummaries', interviewId));
    return true;
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}
```

### Batch Operations

Used for atomically updating multiple documents.

```javascript
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

async function updateKeywordCounts(keywords, interviewId) {
  const batch = writeBatch(db);
  
  for (const keyword of keywords) {
    const keywordRef = doc(db, 'keywordSummaries', keyword);
    batch.update(keywordRef, {
      count: increment(1),
      interviews: arrayUnion(interviewId)
    });
  }
  
  await batch.commit();
}
```

## Security Rules

Firebase security rules control access to the database. The application uses rules that restrict access based on authentication and user roles.

### Example Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authentication check function
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Admin check function
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Match all users' profiles
    match /users/{userId} {
      // Users can read/write their own document
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
      // Admins can read all user profiles
      allow read: if isAdmin();
    }
    
    // Interview summaries collection
    match /interviewSummaries/{documentId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      // Only admins or document creators can write
      allow write: if isAdmin() || 
        (isAuthenticated() && resource.data.processedBy == request.auth.uid);
      
      // Subcollection access
      match /subSummaries/{segmentId} {
        allow read: if isAuthenticated();
        allow write: if isAdmin() || 
          (isAuthenticated() && get(/databases/$(database)/documents/interviewSummaries/$(documentId)).data.processedBy == request.auth.uid);
      }
    }
    
    // Keyword summaries
    match /keywordSummaries/{keywordId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Playlists
    match /playlists/{playlistId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && 
        (resource.data.createdBy == request.auth.uid || isAdmin());
    }
  }
}
```

## Performance Optimization

### Query Optimization Techniques:

1. **Denormalization**: Storing redundant data to minimize join operations
2. **Composite Indexes**: Creating indexes for complex queries
3. **Pagination**: Using `limit()` and cursors for large result sets
4. **Query Caching**: Caching query results in application state

### Cache Strategy:

The application uses a multi-level caching strategy:
1. **Firestore Cache**: Automatic SDK caching
2. **Application State**: React state/context for UI components
3. **Local Storage**: For offline capabilities and performance

## Error Handling

The application implements consistent error handling patterns for Firebase operations:

```javascript
try {
  // Firebase operation
} catch (error) {
  if (error.code === 'permission-denied') {
    // Handle permission errors
  } else if (error.code === 'not-found') {
    // Handle missing document errors
  } else {
    // Handle other errors
    console.error("Operation failed:", error);
  }
}
```

## Best Practices

1. **Security First**: Always implement proper security rules
2. **Batched Writes**: Use batched writes for multiple document updates
3. **Query Efficiency**: Structure queries to minimize read operations
4. **Hierarchical Data**: Use document references instead of deep nesting
5. **Offline Support**: Enable offline persistence for better user experience
6. **Error Handling**: Implement comprehensive error handling

## Related Documentation

- [Authentication](authentication): Detailed authentication documentation
- [Component Documentation](component-documentation): How components interact with Firebase
- [Page Documentation](page-documentation): Page-level Firebase integration 