const admin = require('firebase-admin');

// IMPORTANT: Replace with the actual path to your Firebase Admin SDK service account file
const serviceAccount = require('./llm-hyper-audio-firebase-adminsdk-fbsvc-20605d195b.json');

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


async function aggregateTopics() {
  console.log('Starting topic aggregation...');

  const keywordData = {};
  
  // Use a collectionGroup query to efficiently fetch all 'subSummaries' from all interviews
  const subSummariesSnapshot = await db.collectionGroup('subSummaries').get();

  console.log(`Found ${subSummariesSnapshot.size} clips (subSummaries) to process.`);

  subSummariesSnapshot.forEach((doc) => {
    const subSummary = doc.data();
    const interviewId = doc.ref.parent.parent.id; // Get the parent interview ID

    if (subSummary.keywords) {
      const keywords = subSummary.keywords.split(",").map(kw => kw.trim().toLowerCase());

      keywords.forEach(keyword => {
        if (!keyword) return; // Skip empty keywords

        if (!keywordData[keyword]) {
          keywordData[keyword] = {
            keyword: keyword,
            clipCount: 0,
            interviewIds: new Set(),
            totalLengthSeconds: 0,
          };
        }

        const stats = keywordData[keyword];
        stats.clipCount++;
        stats.interviewIds.add(interviewId);

        // Calculate duration from timestamp
        if (subSummary.timestamp && subSummary.timestamp.includes(" - ")) {
          const start = extractStartTimestamp(subSummary.timestamp);
          const end = extractStartTimestamp(subSummary.timestamp.split(" - ")[1]);
          const duration = Math.max(0, convertTimestampToSeconds(end) - convertTimestampToSeconds(start));
          stats.totalLengthSeconds += duration;
        }
      });
    }
  });

  console.log('Aggregation complete. Writing to Firestore...');

  const batch = db.batch();
  const targetCollection = db.collection('topicGlossary');

  // Clear the existing collection to ensure data is fresh
  const existingDocs = await targetCollection.listDocuments();
  existingDocs.forEach(doc => batch.delete(doc));
  
  let writeCount = 0;
  for (const keyword in keywordData) {
    const stats = keywordData[keyword];

    // Filter out keywords with only 1 clip before writing
    if (stats.clipCount > 1) {
      const docRef = targetCollection.doc(keyword);
      batch.set(docRef, {
        keyword: stats.keyword,
        clipCount: stats.clipCount,
        interviewCount: stats.interviewIds.size, // Convert Set to size
        totalLengthSeconds: Math.round(stats.totalLengthSeconds),
      });
      writeCount++;
    }
  }

  await batch.commit();

  console.log(`Successfully wrote ${writeCount} topics to the 'topicGlossary' collection.`);
  console.log('Topic aggregation script finished.');
}

aggregateTopics().catch(error => {
  console.error("Error running aggregation script:", error);
  process.exit(1);
}); 