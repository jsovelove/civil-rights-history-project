# Migration Plan: interviewSummaries → metadataV2

## Overview

This document outlines the step-by-step migration plan to transition the Civil Rights History Project from using the `interviewSummaries` collection to the enhanced `metadataV2` collection.

## Migration Strategy: Phased Approach

### Phase 1: Preparation and Analysis ✅ COMPLETED
- [x] Analyze metadataV2 structure
- [x] Compare with current interviewSummaries
- [x] Identify all affected components
- [x] Document differences and benefits

### Phase 2: Create Migration Infrastructure
1. **Create field mapping utilities**
2. **Add collection switching capability**
3. **Create validation tools**
4. **Add rollback mechanisms**

### Phase 3: Component-by-Component Migration
1. **Update core services**
2. **Update player components**
3. **Update search functionality**
4. **Update visualization components**

### Phase 4: Testing and Validation
1. **Test all updated components**
2. **Validate data consistency**
3. **Performance testing**
4. **User acceptance testing**

### Phase 5: Full Deployment
1. **Deploy to production**
2. **Monitor for issues**
3. **Archive old collection**
4. **Update documentation**

## Detailed Implementation Plan

### Step 1: Create Field Mapping Service

Create a service to handle field mapping between collections:

```javascript
// src/services/collectionMapper.js
export const mapInterviewData = (data, sourceCollection) => {
  if (sourceCollection === 'metadataV2') {
    return {
      // Direct mappings
      id: data.id,
      documentName: data.documentName,
      mainSummary: data.mainSummary,
      role: data.role,
      videoEmbedLink: data.videoEmbedLink,
      createdAt: data.createdAt,
      
      // Enhanced fields from metadataV2
      processingInfo: data.processingInfo,
      keyThemes: data.keyThemes,
      historicalSignificance: data.historicalSignificance,
      metadata: data.metadata,
      sourceFile: data.sourceFile,
      sourceDirectory: data.sourceDirectory,
      updatedAt: data.updatedAt,
      
      // Derived fields for backward compatibility
      name: data.documentName, // Usually the same
      birthday: '', // Not available in metadataV2
      birthplace: '', // Not available in metadataV2
    };
  } else {
    // Map from interviewSummaries (legacy)
    return {
      id: data.id,
      documentName: data.documentName,
      mainSummary: data.mainSummary,
      role: data.role,
      videoEmbedLink: data.videoEmbedLink,
      createdAt: data.createdAt,
      name: data.name,
      birthday: data.birthday || '',
      birthplace: data.birthplace || '',
      discussionTopics: data.discussionTopics || [],
    };
  }
};

export const mapSubSummaryData = (data, sourceCollection) => {
  if (sourceCollection === 'metadataV2') {
    return {
      id: data.id,
      topic: data.topic,
      summary: data.summary,
      timestamp: data.timestamp,
      startTime: data.startTime,
      endTime: data.endTime,
      
      // Enhanced fields
      chapterNumber: data.chapterNumber,
      mainTopicCategory: data.mainTopicCategory,
      relatedEvents: data.relatedEvents || [],
      notableQuotes: data.notableQuotes || [],
      keywordMatchingInfo: data.keywordMatchingInfo,
      
      // Handle keywords - convert array to string for compatibility
      keywords: Array.isArray(data.keywords) 
        ? data.keywords.join(', ') 
        : data.keywords,
    };
  } else {
    // Legacy interviewSummaries format
    return {
      id: data.id,
      topic: data.topic,
      summary: data.summary,
      timestamp: data.timestamp,
      keywords: data.keywords, // Already a string
      discussionTopic: data.discussionTopic,
    };
  }
};
```

### Step 2: Update Firebase Service

Add collection switching capability:

```javascript
// src/services/firebase.js
const USE_METADATA_V2 = true; // Feature flag

export const getInterviewCollection = () => {
  return USE_METADATA_V2 ? 'metadataV2' : 'interviewSummaries';
};

export const getInterviewData = async (documentId) => {
  const collectionName = getInterviewCollection();
  const docRef = doc(db, collectionName, documentId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return mapInterviewData({ id: docSnap.id, ...data }, collectionName);
  }
  return null;
};

export const getInterviewSegments = async (documentId) => {
  const collectionName = getInterviewCollection();
  const subRef = collection(db, collectionName, documentId, 'subSummaries');
  const subSnap = await getDocs(subRef);
  
  const segments = [];
  subSnap.forEach((doc) => {
    const data = doc.data();
    segments.push(mapSubSummaryData({ id: doc.id, ...data }, collectionName));
  });
  
  return segments;
};
```

### Step 3: Update InterviewPlayer Component

```javascript
// src/pages/InterviewPlayer.jsx
// Update the data fetching logic

useEffect(() => {
  if (!documentName) {
    setError('Document name is missing')
    setLoading(false)
    return
  }

  async function fetchData() {
    try {
      setLoading(true)
      
      // Use the new service
      const mainData = await getInterviewData(documentName);
      if (!mainData) {
        setError('Interview not found')
        setLoading(false)
        return
      }
      setMainSummary(mainData)

      // Fetch segments using new service
      const subs = await getInterviewSegments(documentName);
      
      // Sort segments by timestamp (handling both formats)
      subs.sort((a, b) => {
        const timeA = a.startTime || extractStartTimestamp(a.timestamp);
        const timeB = b.startTime || extractStartTimestamp(b.timestamp);
        return convertTimestampToSeconds(timeA) - convertTimestampToSeconds(timeB);
      });
      
      setSubSummaries(subs)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching interview data:', err)
      setError('Failed to load interview data')
      setLoading(false)
    }
  }

  fetchData()
}, [documentName])
```

### Step 4: Update Search Components

```javascript
// src/components/VectorSearchOverlay.jsx & src/pages/VectorSearchPage.jsx
// Update the fetchResultMetadata function

const fetchResultMetadata = async (searchResults) => {
  const enhancedResults = [];
  
  for (const result of searchResults) {
    try {
      // Use the new service
      const interviewData = await getInterviewData(result.documentId);
      
      let segmentData = null;
      if (result.segmentId) {
        const segments = await getInterviewSegments(result.documentId);
        segmentData = segments.find(seg => seg.id === result.segmentId);
      }
      
      // Extract video ID for thumbnail
      const thumbnailUrl = interviewData?.videoEmbedLink ?
        `https://img.youtube.com/vi/${extractVideoId(interviewData.videoEmbedLink)}/mqdefault.jpg` : null;
      
      enhancedResults.push({
        ...result,
        personName: interviewData?.documentName || "Unknown",
        topic: segmentData?.topic || "Untitled Segment",
        timestamp: segmentData?.timestamp || "",
        summary: segmentData?.summary || result.textPreview,
        keywords: segmentData?.keywords || "",
        thumbnailUrl,
        // New enhanced fields
        keyThemes: interviewData?.keyThemes || [],
        historicalSignificance: interviewData?.historicalSignificance,
        mainTopicCategory: segmentData?.mainTopicCategory,
        relatedEvents: segmentData?.relatedEvents || [],
      });
    } catch (error) {
      console.error(`Error fetching metadata for result ${result.id}:`, error);
      enhancedResults.push(result);
    }
  }
  
  return enhancedResults;
};
```

### Step 5: Update Visualization Components

```javascript
// Update components to leverage new structured data

// src/components/visualization/BubbleChart.jsx
// Can now use keyThemes for better categorization

// src/components/KeywordDirectory.jsx
// Can leverage keywordMatchingInfo for better relevance

// src/components/MetadataPanel.jsx
// Can display richer metadata and historical significance
```

### Step 6: Create Migration Testing Script

```javascript
// test-migration.cjs
const admin = require('firebase-admin');

// Test data consistency between collections
async function testMigration() {
  const serviceAccount = require('./llm-hyper-audio-firebase-adminsdk-fbsvc-fb01161b83.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  const db = admin.firestore();
  
  // Get sample documents from both collections
  const interviewsSnapshot = await db.collection('interviewSummaries').limit(5).get();
  const metadataV2Snapshot = await db.collection('metadataV2').limit(5).get();
  
  console.log('Testing field mappings...');
  
  // Test if documents exist in both collections
  for (const interviewDoc of interviewsSnapshot.docs) {
    const docId = interviewDoc.id;
    const metadataDoc = await db.collection('metadataV2').doc(docId).get();
    
    if (metadataDoc.exists()) {
      console.log(`✅ Document ${docId} exists in both collections`);
      
      // Compare key fields
      const interviewData = interviewDoc.data();
      const metadataData = metadataDoc.data();
      
      const fieldsToCompare = ['documentName', 'mainSummary', 'role', 'videoEmbedLink'];
      for (const field of fieldsToCompare) {
        const match = interviewData[field] === metadataData[field];
        console.log(`  ${field}: ${match ? '✅' : '❌'} ${match ? 'matches' : 'differs'}`);
      }
    } else {
      console.log(`❌ Document ${docId} missing in metadataV2`);
    }
  }
  
  console.log('Migration test complete.');
}

testMigration();
```

## Migration Checklist

### Pre-Migration
- [ ] Back up current interviewSummaries collection
- [ ] Create feature flag system
- [ ] Set up monitoring and logging
- [ ] Create rollback procedures

### During Migration
- [ ] Test each component individually
- [ ] Validate data consistency
- [ ] Monitor application performance
- [ ] Check for missing or incorrect data

### Post-Migration
- [ ] Update all documentation
- [ ] Archive old collection (after verification period)
- [ ] Update deployment scripts
- [ ] Train team on new structure

## Rollback Plan

If issues are encountered:

1. **Immediate**: Set `USE_METADATA_V2 = false` in firebase.js
2. **Component-level**: Use feature flags to revert specific components
3. **Data-level**: Restore from backups if necessary

## Timeline Estimate

- **Phase 2**: 2-3 days (Infrastructure)
- **Phase 3**: 3-5 days (Component updates)
- **Phase 4**: 2-3 days (Testing)
- **Phase 5**: 1 day (Deployment)

**Total**: ~1-2 weeks with proper testing

## Success Metrics

- [ ] All components work with metadataV2
- [ ] No data loss or corruption
- [ ] Improved search and discovery features
- [ ] Enhanced user experience with richer metadata
- [ ] Better analytics and insights available

## Conclusion

This migration will significantly enhance the application's capabilities by leveraging the richer metadata structure in metadataV2. The phased approach ensures minimal disruption while maximizing the benefits of the enhanced data structure.
