const admin = require('firebase-admin');

// IMPORTANT: Replace with the actual path to your Firebase Admin SDK service account file
const serviceAccount = require('./llm-hyper-audio-firebase-adminsdk-fbsvc-fb01161b83.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Extracts a clean timestamp from a raw string (e.g., "[00:12:34] - ...")
 * @param {string} rawTimestamp - The raw timestamp string.
 * @returns {string} A clean timestamp in HH:MM:SS or MM:SS format.
 */
const extractStartTimestamp = (rawTimestamp) => {
  if (!rawTimestamp) return "00:00";
  const match = rawTimestamp.match(/(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?)/);
  return match ? match[1] : "00:00";
};

/**
 * Converts a timestamp string (e.g., "01:23:45" or "23:45") to total seconds.
 * @param {string} timestamp - The timestamp string.
 * @returns {number} The total time in seconds.
 */
const convertTimestampToSeconds = (timestamp) => {
  if (!timestamp) return 0;
  const parts = timestamp.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

/**
 * Extracts YouTube video ID from various URL formats
 * @param {string} videoEmbedLink - YouTube URL
 * @returns {string|null} YouTube video ID or null if not valid
 */
const extractVideoId = (videoEmbedLink) => {
  if (!videoEmbedLink) return null;
  
  const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
  const match = videoEmbedLink.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

async function aggregateInterviews() {
  console.log('Starting interview aggregation...');

  const interviewsData = [];
  
  // Fetch all interviews from metadataV2 collection
  const interviewsSnapshot = await db.collection('metadataV2').get();
  
  console.log(`Found ${interviewsSnapshot.size} interviews to process.`);

  for (const interviewDoc of interviewsSnapshot.docs) {
    const interviewData = interviewDoc.data();
    const interviewId = interviewDoc.id;

    // Calculate total duration from subSummaries
    let totalMinutes = 0;
    let clipCount = 0;
    
    try {
      const subSummariesSnapshot = await db.collectionGroup('subSummaries')
        .where(admin.firestore.FieldPath.documentId(), '>=', `${interviewId}/subSummaries/`)
        .where(admin.firestore.FieldPath.documentId(), '<', `${interviewId}/subSummaries/\uf8ff`)
        .get();
      
      subSummariesSnapshot.forEach((doc) => {
        // Check if this document belongs to the current interview
        const docPath = doc.ref.path;
        const belongsToInterview = docPath.startsWith(`metadataV2/${interviewId}/subSummaries/`);
        
        if (belongsToInterview) {
          const subSummary = doc.data();
          clipCount++;
          
          if (subSummary.timestamp && subSummary.timestamp.includes(" - ")) {
            const start = extractStartTimestamp(subSummary.timestamp);
            const end = extractStartTimestamp(subSummary.timestamp.split(" - ")[1]);
            const durationSeconds = Math.max(0, convertTimestampToSeconds(end) - convertTimestampToSeconds(start));
            totalMinutes += durationSeconds / 60;
          }
        }
      });
    } catch (error) {
      console.warn(`Could not calculate duration for interview ${interviewId}:`, error);
      
      // Fallback: try the direct subcollection approach
      try {
        const subSummariesRef = db.collection('metadataV2').doc(interviewId).collection('subSummaries');
        const subSummariesSnapshot = await subSummariesRef.get();
        
        subSummariesSnapshot.forEach((doc) => {
          const subSummary = doc.data();
          clipCount++;
          
          if (subSummary.timestamp && subSummary.timestamp.includes(" - ")) {
            const start = extractStartTimestamp(subSummary.timestamp);
            const end = extractStartTimestamp(subSummary.timestamp.split(" - ")[1]);
            const durationSeconds = Math.max(0, convertTimestampToSeconds(end) - convertTimestampToSeconds(start));
            totalMinutes += durationSeconds / 60;
          }
        });
      } catch (fallbackError) {
        console.warn(`Fallback also failed for interview ${interviewId}:`, fallbackError);
      }
    }

    const videoId = extractVideoId(interviewData.videoEmbedLink);
    
    const processedInterview = {
      id: interviewId,
      name: interviewData.documentName || interviewData.name || 'Unknown Name',
      role: interviewData.role || 'Unknown Role',
      roleSimplified: interviewData.roleSimplified || interviewData.role || 'Unknown Role',
      videoEmbedLink: interviewData.videoEmbedLink,
      thumbnailUrl: videoId ? 
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : 
        null,
      totalMinutes: Math.round(totalMinutes),
      clipCount: clipCount
    };

    interviewsData.push(processedInterview);
    console.log(`Processed: ${processedInterview.name} - ${processedInterview.totalMinutes} minutes (${clipCount} clips)`);
  }

  console.log('Aggregation complete. Writing to Firestore...');

  const batch = db.batch();
  const targetCollection = db.collection('interviewIndex');

  // Clear the existing collection to ensure data is fresh
  const existingDocs = await targetCollection.listDocuments();
  existingDocs.forEach(doc => batch.delete(doc));
  
  // Write the aggregated interview data
  interviewsData.forEach(interview => {
    const docRef = targetCollection.doc(interview.id);
    batch.set(docRef, interview);
  });

  await batch.commit();

  console.log(`Successfully wrote ${interviewsData.length} interviews to the 'interviewIndex' collection.`);
  
  // Calculate and display summary statistics
  const totalMinutes = interviewsData.reduce((sum, interview) => sum + interview.totalMinutes, 0);
  const totalClips = interviewsData.reduce((sum, interview) => sum + interview.clipCount, 0);
  
  console.log(`Summary: ${interviewsData.length} interviews, ${totalMinutes} total minutes, ${totalClips} total clips`);
  console.log('Interview aggregation script finished.');
}

aggregateInterviews().catch(error => {
  console.error("Error running interview aggregation script:", error);
  process.exit(1);
}); 