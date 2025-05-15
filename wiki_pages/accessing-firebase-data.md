# Accessing Firebase Data Outside the Project

This guide provides instructions for accessing and working with the Civil Rights History Project's Firebase data outside of the main application. It's intended for collaborators who have been granted access to the Firebase console.

## Firebase Project Access

### Getting Access

Access to the Firebase project is granted by the project administrator. Once you've received access:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. You should see "LLM Hyper Audio" (the project's internal name) in your list of available projects
3. Click on the project to access its resources

### Understanding the Firebase Console

The Firebase console provides several sections for managing different aspects of the project:

- **Project Overview**: General information and settings
- **Authentication**: User accounts and settings
- **Firestore Database**: The NoSQL database containing all project data
- **Storage**: File storage (if used)
- **Functions**: Cloud functions (if deployed)

## Firestore Database Structure

The project's data is stored in Firestore Database, a NoSQL document database. The main data collections are:

### `interviewSummaries` Collection

This collection contains documents representing processed interview transcripts:

```
interviewSummaries/
  {documentId}/
    - documentName: string         // The name of the interview document
    - mainSummary: string          // Overall summary of the interview
    - createdAt: timestamp         // When the summary was created
    - status: string               // Processing status
    - videoEmbedLink: string       // YouTube embed URL (if available)
    - userID: string               // ID of the user who created the entry
    - source: string               // Source of the transcript (e.g., "youtube", "file_upload")
```

Each interview document contains a subcollection with detailed segments:

```
interviewSummaries/{documentId}/subSummaries/
  {keyPointId}/
    - topic: string                // Title/topic of the segment
    - timestamp: string            // Timestamp in format "MM:SS - MM:SS"
    - keywords: string             // Comma-separated list of keywords
    - summary: string              // Detailed summary of the segment
```

### `keywordSummaries` Collection

This collection contains aggregated information about keywords:

```
keywordSummaries/
  {keywordId}/
    - keyword: string              // The keyword itself
    - count: number                // Number of occurrences
    - interviews: array            // List of interview IDs containing this keyword
```

## Accessing Data

### Through the Firebase Console

1. From the project dashboard, select "Firestore Database" in the left sidebar
2. Navigate through the collections and documents to browse the data
3. You can view, add, edit, and delete documents directly in the console
4. Use the "Filter" functionality to find specific documents

### Programmatic Access

#### Using the Firebase Admin SDK

For administrative access from your own code:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Example: Get all interviews
async function getAllInterviews() {
  const snapshot = await db.collection('interviewSummaries').get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

// Example: Get specific interview and its segments
async function getInterviewWithSegments(interviewId) {
  // Get main document
  const interviewDoc = await db.collection('interviewSummaries').doc(interviewId).get();
  if (!interviewDoc.exists) {
    console.log('Interview not found');
    return null;
  }
  
  // Get segments subcollection
  const segmentsSnapshot = await db
    .collection('interviewSummaries')
    .doc(interviewId)
    .collection('subSummaries')
    .get();
  
  const segments = [];
  segmentsSnapshot.forEach(doc => {
    segments.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  return {
    interview: interviewDoc.data(),
    segments
  };
}
```

#### Using the Firebase Web SDK

For client-side applications:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDGolxlZNoEzk7z46ZMtSk9YsP32MlH45Q",
  authDomain: "llm-hyper-audio.firebaseapp.com",
  projectId: "llm-hyper-audio",
  storageBucket: "llm-hyper-audio.firebasestorage.app",
  messagingSenderId: "530304773274",
  appId: "1:530304773274:web:1764f58974d6c2fd060323",
  measurementId: "G-HFEKE65YC6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Example: Get all interviews
async function getAllInterviews() {
  const querySnapshot = await getDocs(collection(db, "interviewSummaries"));
  querySnapshot.forEach((doc) => {
    console.log(doc.id, " => ", doc.data());
  });
}

// Example: Get specific interview
async function getInterview(interviewId) {
  const docRef = doc(db, "interviewSummaries", interviewId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.log("No such document!");
    return null;
  }
}

// Example: Filter interviews by keyword
async function findInterviewsByKeyword(keyword) {
  // Step 1: Normalize the keyword (lowercase, trimmed)
  const normalizedKeyword = keyword.toLowerCase().trim();
  
  // Step 2: First approach - Query the keywordSummaries collection directly
  const keywordQuery = query(
    collection(db, "keywordSummaries"),
    where("keyword", "==", normalizedKeyword)
  );
  
  const keywordSnapshot = await getDocs(keywordQuery);
  if (!keywordSnapshot.empty) {
    // We found the keyword document, which contains interview references
    const keywordDoc = keywordSnapshot.docs[0].data();
    const interviewIds = keywordDoc.interviews || [];
    
    // Now fetch those interviews
    const interviews = [];
    for (const interviewId of interviewIds) {
      const interviewDoc = await getDoc(doc(db, "interviewSummaries", interviewId));
      if (interviewDoc.exists()) {
        interviews.push({
          id: interviewDoc.id,
          ...interviewDoc.data()
        });
      }
    }
    
    return interviews;
  }
  
  // Step 3: Alternative approach - Search through all interviews and their segments
  // This is more resource-intensive but works if keywordSummaries isn't maintained
  console.log("Keyword not found in index, searching all interviews...");
  
  const allInterviews = [];
  const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));
  
  for (const interviewDoc of interviewsSnapshot.docs) {
    const interviewData = interviewDoc.data();
    let keywordFound = false;
    
    // Check segments for this interview
    const segmentsSnapshot = await getDocs(
      collection(db, "interviewSummaries", interviewDoc.id, "subSummaries")
    );
    
    segmentsSnapshot.forEach(segmentDoc => {
      const segmentData = segmentDoc.data();
      // Check if keywords field contains our search term
      if (segmentData.keywords && 
          segmentData.keywords.toLowerCase().includes(normalizedKeyword)) {
        keywordFound = true;
      }
    });
    
    if (keywordFound) {
      allInterviews.push({
        id: interviewDoc.id,
        ...interviewData
      });
    }
  }
  
  return allInterviews;
}

// Example: Get segments that contain specific keywords
async function findSegmentsByKeywords(keywords, operator = "OR") {
  // Convert single keyword to array for consistent handling
  const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
  const normalizedKeywords = keywordArray.map(k => k.toLowerCase().trim());
  
  const matchingSegments = [];
  const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));
  
  for (const interviewDoc of interviewsSnapshot.docs) {
    const interviewData = interviewDoc.data();
    
    // Get segments for this interview
    const segmentsSnapshot = await getDocs(
      collection(db, "interviewSummaries", interviewDoc.id, "subSummaries")
    );
    
    segmentsSnapshot.forEach(segmentDoc => {
      const segmentData = segmentDoc.data();
      if (!segmentData.keywords) return;
      
      const segmentKeywords = segmentData.keywords.toLowerCase();
      
      // Check if segment matches our keyword criteria
      let isMatch = false;
      
      if (operator === "AND") {
        // All keywords must be present
        isMatch = normalizedKeywords.every(keyword => 
          segmentKeywords.includes(keyword)
        );
      } else {
        // At least one keyword must be present (OR)
        isMatch = normalizedKeywords.some(keyword => 
          segmentKeywords.includes(keyword)
        );
      }
      
      if (isMatch) {
        matchingSegments.push({
          id: segmentDoc.id,
          interviewId: interviewDoc.id,
          interviewName: interviewData.documentName,
          ...segmentData
        });
      }
    });
  }
  
  return matchingSegments;
}

// Example usage:
// Find interviews containing "civil rights"
// findInterviewsByKeyword("civil rights").then(interviews => console.log(interviews));

// Find segments containing both "protest" AND "alabama"
// findSegmentsByKeywords(["protest", "alabama"], "AND").then(segments => console.log(segments));
```

### How Keyword Filtering is Implemented in the Project

The application uses a simple and direct approach to keyword searches. Here's a simplified version of how it's done:

```javascript
/**
 * Search for segments that match specific keywords
 * 
 * @param {string} keywordString - Comma-separated keywords to search for (e.g., "civil rights, voting")
 * @returns {Promise<Array>} Matching segments with their parent interview data
 */
async function searchByKeywords(keywordString) {
  // Step 1: Prepare keywords
  const keywords = keywordString
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);
  
  if (keywords.length === 0) return [];
  
  // Step 2: Search all interviews and their segments
  const results = [];
  const interviewsRef = collection(db, "interviewSummaries");
  const interviewsSnapshot = await getDocs(interviewsRef);
  
  // Step 3: Loop through each interview
  for (const interviewDoc of interviewsSnapshot.docs) {
    const interviewData = interviewDoc.data();
    const interviewId = interviewDoc.id;
    
    // Step 4: Get segments for this interview
    const segmentsRef = collection(db, "interviewSummaries", interviewId, "subSummaries");
    const segmentsSnapshot = await getDocs(segmentsRef);
    
    // Step 5: Check each segment for keyword matches
    segmentsSnapshot.forEach(segmentDoc => {
      const segmentData = segmentDoc.data();
      
      // Skip segments without keywords
      if (!segmentData.keywords) return;
      
      // Get segment keywords as array
      const segmentKeywords = segmentData.keywords.toLowerCase().split(',').map(k => k.trim());
      
      // Check if ANY of our search keywords match
      const hasMatch = keywords.some(keyword => segmentKeywords.includes(keyword));
      
      // If there's a match, add to results
      if (hasMatch) {
        results.push({
          id: segmentDoc.id,
          interviewId: interviewId,
          interviewName: interviewData.documentName,
          topic: segmentData.topic,
          timestamp: segmentData.timestamp,
          keywords: segmentData.keywords,
          summary: segmentData.summary
        });
      }
    });
  }
  
  return results;
}
```

This simplified approach:

1. Takes a comma-separated string of keywords (e.g., "civil rights, voting")
2. Converts it to an array of normalized keywords
3. Searches through all interview documents and their segments
4. Returns matching segments with interview metadata

You can call it like this:

```javascript
// Find segments containing "civil rights" or "voting"
searchByKeywords("civil rights, voting").then(results => {
  console.log(`Found ${results.length} matching segments`);
  console.log(results);
});
```

The application uses this approach because it's simple, flexible, and works well with the current data volume. For larger datasets, you might want to consider using a more sophisticated search solution.

### Getting All Keywords from the Database

A common task is extracting a list of all unique keywords across the entire database. Here's how to do it:

```javascript
/**
 * Get all unique keywords from the entire database
 * 
 * @returns {Promise<Array>} Array of objects with keyword and count
 */
async function getAllKeywords() {
  // First, check if we have the keywordSummaries collection
  const keywordSummariesRef = collection(db, "keywordSummaries");
  const keywordSummariesSnapshot = await getDocs(keywordSummariesRef);
  
  // If we have entries in the keywordSummaries collection, use that (faster)
  if (!keywordSummariesSnapshot.empty) {
    console.log("Using keywordSummaries collection for fast retrieval");
    
    const keywords = [];
    keywordSummariesSnapshot.forEach(doc => {
      const data = doc.data();
      keywords.push({
        keyword: data.keyword,
        count: data.count || 0,
        interviews: data.interviews || []
      });
    });
    
    // Sort by count (most frequent first)
    return keywords.sort((a, b) => b.count - a.count);
  }
  
  // If no keywordSummaries collection, extract keywords from all segments (slower)
  console.log("No keyword index found, scanning all interviews and segments");
  
  const keywordMap = new Map(); // Use Map for better performance with large datasets
  const interviewsSnapshot = await getDocs(collection(db, "interviewSummaries"));
  
  // Process each interview
  for (const interviewDoc of interviewsSnapshot.docs) {
    const interviewId = interviewDoc.id;
    const segmentsSnapshot = await getDocs(
      collection(db, "interviewSummaries", interviewId, "subSummaries")
    );
    
    // Process each segment in this interview
    segmentsSnapshot.forEach(segmentDoc => {
      const segmentData = segmentDoc.data();
      if (!segmentData.keywords) return;
      
      // Split keywords string into array and normalize
      const keywordList = segmentData.keywords
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);
      
      // Update our keyword map
      keywordList.forEach(keyword => {
        if (keywordMap.has(keyword)) {
          const entry = keywordMap.get(keyword);
          entry.count++;
          if (!entry.interviews.includes(interviewId)) {
            entry.interviews.push(interviewId);
          }
        } else {
          keywordMap.set(keyword, {
            keyword: keyword,
            count: 1,
            interviews: [interviewId]
          });
        }
      });
    });
  }
  
  // Convert map to array and sort by frequency
  const keywords = Array.from(keywordMap.values())
    .sort((a, b) => b.count - a.count);
  
  return keywords;
}

// Example usage:
getAllKeywords().then(keywords => {
  console.log(`Found ${keywords.length} unique keywords in the database`);
  
  // Display the top 10 most frequent keywords
  console.log("Top 10 keywords:");
  keywords.slice(0, 10).forEach(k => {
    console.log(`${k.keyword}: ${k.count} occurrences in ${k.interviews.length} interviews`);
  });
  
  // Optional: save to file
  const fs = require('fs');
  fs.writeFileSync('./all-keywords.json', JSON.stringify(keywords, null, 2));
});
```

### How the BubbleChart Component Gets Keywords

The BubbleChart visualization in the Civil Rights History Project uses a similar approach to extract and process keywords. Here's the actual implementation from the BubbleChart component:

```javascript
/**
 * Extract keywords from all interviews for visualization
 * Based on the implementation in BubbleChart.jsx
 */
async function getKeywordsForVisualization() {
  try {
    // Object to store keyword counts
    const keywordCounts = {};
    
    // Get all interviews
    const interviewsSnapshot = await getDocs(collection(db, 'interviewSummaries'));
    
    // Process each interview's segments asynchronously
    const fetchSubSummaries = interviewsSnapshot.docs.map(async (interviewDoc) => {
      // Get the segments subcollection for this interview
      const subSummariesRef = collection(
        db, 
        'interviewSummaries', 
        interviewDoc.id, 
        'subSummaries'
      );
      const subSummariesSnapshot = await getDocs(subSummariesRef);
      
      // Process each segment's keywords
      subSummariesSnapshot.forEach((doc) => {
        const subSummary = doc.data();
        if (subSummary.keywords) {
          // Split, normalize, and count each keyword
          subSummary.keywords
            .split(',')
            .map((kw) => kw.trim().toLowerCase())
            .forEach((keyword) => {
              keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            });
        }
      });
    });
    
    // Wait for all interview processing to complete
    await Promise.all(fetchSubSummaries);
    
    // Filter out keywords with only 1 occurrence
    const filteredKeywordCounts = Object.fromEntries(
      Object.entries(keywordCounts).filter(([_, count]) => count > 1)
    );
    
    // Transform into visualization-ready format
    return {
      name: 'keywords',
      children: Object.entries(filteredKeywordCounts).map(([keyword, count]) => ({
        name: keyword,
        value: count,
      })),
    };
  } catch (err) {
    console.error('Error fetching keyword data:', err);
    throw err;
  }
}

// Example usage for data visualization:
getKeywordsForVisualization().then(data => {
  // Sort keywords by frequency and get top 20
  const topKeywords = [...data.children]
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
    
  console.log("Top 20 keywords for visualization:");
  topKeywords.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name}: ${item.value} occurrences`);
  });
  
  // Data is now ready for visualization with d3.js or other libraries
  // In the BubbleChart component, this data is used with d3-hierarchy:
  //
  // const root = hierarchy(data)
  //   .sum((d) => d.value)
  //   .sort((a, b) => b.value - a.value);
});
```

This implementation:

1. Queries all interviews from the 'interviewSummaries' collection
2. For each interview, retrieves all segments from its 'subSummaries' subcollection
3. Processes each keyword from the comma-separated list in each segment
4. Maintains a count of each keyword's frequency
5. Filters out keywords with only one occurrence (to reduce noise)
6. Returns the data in a hierarchical structure ready for visualization

The BubbleChart component then adds additional processing to:
- Allow interactive filtering by keyword count thresholds
- Support searching within keywords
- Limit visualization to top N keywords with an "Others" category
- Apply color scales based on frequency

This approach to keyword extraction is efficient for the current data volume and provides a good foundation for both data analysis and visualization.

### Exporting Data

To export data for use in other systems:

1. In the Firebase Console, go to "Project Settings" (gear icon)
2. Navigate to the "Service accounts" tab
3. Click "Generate new private key" to download a service account key
4. Use the Firebase Admin SDK with this key to export data

Example script to export all data to JSON files:

```javascript
const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportAllData() {
  // Export interview summaries
  const interviewsSnapshot = await db.collection('interviewSummaries').get();
  const interviews = [];
  
  for (const doc of interviewsSnapshot.docs) {
    const interview = {
      id: doc.id,
      ...doc.data(),
      segments: []
    };
    
    // Get segments for this interview
    const segmentsSnapshot = await db
      .collection('interviewSummaries')
      .doc(doc.id)
      .collection('subSummaries')
      .get();
    
    segmentsSnapshot.forEach(segDoc => {
      interview.segments.push({
        id: segDoc.id,
        ...segDoc.data()
      });
    });
    
    interviews.push(interview);
  }
  
  // Export keywords
  const keywordsSnapshot = await db.collection('keywordSummaries').get();
  const keywords = [];
  
  keywordsSnapshot.forEach(doc => {
    keywords.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  // Write to files
  fs.writeFileSync('./interviews-export.json', JSON.stringify(interviews, null, 2));
  fs.writeFileSync('./keywords-export.json', JSON.stringify(keywords, null, 2));
  
  console.log(`Exported ${interviews.length} interviews and ${keywords.length} keywords`);
}

exportAllData();
```

## Working with Exported Data

Once you have the data exported, you can:

### Convert to CSV for Spreadsheets

```javascript
const fs = require('fs');
const { parse } = require('json2csv');

// Load exported data
const interviews = JSON.parse(fs.readFileSync('./interviews-export.json'));

// Prepare data for CSV
const interviewsForCsv = interviews.map(interview => ({
  id: interview.id,
  documentName: interview.documentName,
  mainSummary: interview.mainSummary,
  createdAt: interview.createdAt?.toDate?.() || interview.createdAt,
  videoLink: interview.videoEmbedLink,
  segmentCount: interview.segments.length
}));

// Generate CSV
const csv = parse(interviewsForCsv);
fs.writeFileSync('./interviews-summary.csv', csv);

// Generate segments CSV
const segments = [];
interviews.forEach(interview => {
  interview.segments.forEach(segment => {
    segments.push({
      interviewId: interview.id,
      interviewName: interview.documentName,
      segmentId: segment.id,
      topic: segment.topic,
      timestamp: segment.timestamp,
      keywords: segment.keywords,
      summary: segment.summary
    });
  });
});

const segmentsCsv = parse(segments);
fs.writeFileSync('./segments.csv', segmentsCsv);
```

### Import into Other Databases

#### SQL Import Example

```javascript
const fs = require('fs');
const mysql = require('mysql2/promise');

async function importToMySql() {
  // Load exported data
  const interviews = JSON.parse(fs.readFileSync('./interviews-export.json'));
  
  // Connect to MySQL
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'civil_rights'
  });
  
  // Create tables if they don't exist
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS interviews (
      id VARCHAR(255) PRIMARY KEY,
      document_name VARCHAR(255) NOT NULL,
      main_summary TEXT,
      created_at DATETIME,
      video_link TEXT
    )
  `);
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS segments (
      id VARCHAR(255) PRIMARY KEY,
      interview_id VARCHAR(255) NOT NULL,
      topic VARCHAR(255) NOT NULL,
      timestamp VARCHAR(50),
      keywords TEXT,
      summary TEXT,
      FOREIGN KEY (interview_id) REFERENCES interviews(id)
    )
  `);
  
  // Import interviews
  for (const interview of interviews) {
    await connection.execute(
      `INSERT INTO interviews (id, document_name, main_summary, created_at, video_link) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       document_name = VALUES(document_name),
       main_summary = VALUES(main_summary),
       video_link = VALUES(video_link)`,
      [
        interview.id, 
        interview.documentName, 
        interview.mainSummary,
        interview.createdAt?.toDate?.() || interview.createdAt || new Date(),
        interview.videoEmbedLink
      ]
    );
    
    // Import segments
    for (const segment of interview.segments) {
      await connection.execute(
        `INSERT INTO segments (id, interview_id, topic, timestamp, keywords, summary)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         topic = VALUES(topic),
         timestamp = VALUES(timestamp),
         keywords = VALUES(keywords),
         summary = VALUES(summary)`,
        [
          segment.id,
          interview.id,
          segment.topic,
          segment.timestamp,
          segment.keywords,
          segment.summary
        ]
      );
    }
  }
  
  console.log('Data imported to MySQL');
  await connection.end();
}
```

## Data Analysis Examples

### Basic Keyword Frequency Analysis

```javascript
const fs = require('fs');

// Load exported data
const interviews = JSON.parse(fs.readFileSync('./interviews-export.json'));

// Extract all keywords
const keywordFrequency = {};
interviews.forEach(interview => {
  interview.segments.forEach(segment => {
    if (segment.keywords) {
      const keywordList = segment.keywords.split(',').map(k => k.trim().toLowerCase());
      keywordList.forEach(keyword => {
        keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
      });
    }
  });
});

// Sort keywords by frequency
const sortedKeywords = Object.entries(keywordFrequency)
  .sort((a, b) => b[1] - a[1])
  .map(([keyword, count]) => ({ keyword, count }));

// Output top 20 keywords
console.log('Top 20 keywords:');
console.table(sortedKeywords.slice(0, 20));
fs.writeFileSync('./keyword-frequency.json', JSON.stringify(sortedKeywords, null, 2));
```

### Topic Correlation Analysis

```javascript
const fs = require('fs');

// Load exported data
const interviews = JSON.parse(fs.readFileSync('./interviews-export.json'));

// Extract keyword pairs
const keywordPairs = {};
interviews.forEach(interview => {
  interview.segments.forEach(segment => {
    if (segment.keywords) {
      const keywordList = segment.keywords.split(',').map(k => k.trim().toLowerCase());
      // Generate all pairs
      for (let i = 0; i < keywordList.length; i++) {
        for (let j = i + 1; j < keywordList.length; j++) {
          const pair = [keywordList[i], keywordList[j]].sort().join('::');
          keywordPairs[pair] = (keywordPairs[pair] || 0) + 1;
        }
      }
    }
  });
});

// Sort pairs by frequency
const sortedPairs = Object.entries(keywordPairs)
  .sort((a, b) => b[1] - a[1])
  .map(([pair, count]) => ({ 
    keywords: pair.split('::'), 
    count 
  }));

// Output top 20 pairs
console.log('Top 20 keyword pairs:');
console.table(sortedPairs.slice(0, 20));
fs.writeFileSync('./keyword-pairs.json', JSON.stringify(sortedPairs, null, 2));
```

## Security Considerations

When working with the Firebase data outside the main application:

1. **Protect Service Account Keys**: Never commit service account keys to public repositories
2. **Limit Access**: Share Firebase console access only with trusted collaborators
3. **Read-Only Access**: Consider providing read-only access when full access isn't needed
4. **Data Privacy**: Be mindful of any personally identifiable information in the data
5. **Audit Logs**: Periodically review access logs in the Firebase console

## Getting Help

If you encounter issues accessing or working with the Firebase data:

- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Contact the project administrator for access-related issues
- Refer to the [Firebase Support](https://firebase.google.com/support) resources 