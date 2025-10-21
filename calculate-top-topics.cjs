/**
 * Script to calculate top topics by interview count and store in Firebase
 * Run this once to populate the topTopics collection
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./llm-hyper-audio-firebase-adminsdk-fbsvc-fb01161b83.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://llm-hyper-audio-firebase-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function calculateTopTopics() {
  try {
    console.log('Starting top topics calculation...');
    console.log('Using the same method as Topic Glossary: analyzing subSummaries collection group...');
    
    // Use collection group query to get all subSummaries (same as Topic Glossary)
    const subSummariesSnapshot = await db.collectionGroup('subSummaries').get();
    console.log(`Found ${subSummariesSnapshot.size} clips in subSummaries collection group`);
    
    if (subSummariesSnapshot.empty) {
      console.error('No subSummaries found in collection group');
      return;
    }
    
    const topicCounts = new Map();
    const interviewCounts = new Map(); // Track unique interviews per topic
    let processedDocs = 0;
    let docsWithKeywords = 0;
    
    subSummariesSnapshot.forEach(doc => {
      const subSummary = doc.data();
      const interviewId = doc.ref.parent.parent.id;
      processedDocs++;
      
      // Debug: Show structure of first few documents
      if (processedDocs <= 3) {
        console.log(`Document ${processedDocs} structure:`, Object.keys(subSummary));
        console.log(`Keywords field:`, subSummary.keywords);
        console.log(`Interview ID:`, interviewId);
      }
      
      // Process keywords (handle both string and array formats - same as Topic Glossary)
      let keywords = [];
      if (typeof subSummary.keywords === 'string') {
        keywords = subSummary.keywords.split(",").map(kw => kw.trim().toLowerCase());
      } else if (Array.isArray(subSummary.keywords)) {
        keywords = subSummary.keywords.map(kw => kw.toLowerCase());
      }
      
      if (keywords.length > 0) {
        docsWithKeywords++;
        
        keywords.forEach(keyword => {
          if (!keyword) return;
          
          // Count clips
          topicCounts.set(keyword, (topicCounts.get(keyword) || 0) + 1);
          
          // Track unique interviews
          if (!interviewCounts.has(keyword)) {
            interviewCounts.set(keyword, new Set());
          }
          interviewCounts.get(keyword).add(interviewId);
        });
      }
    });
    
    console.log(`Processed ${processedDocs} clips, ${docsWithKeywords} had keywords`);
    
    console.log(`Found ${topicCounts.size} unique topics`);
    
    // Convert to array and sort by clip count
    const sortedTopics = Array.from(topicCounts.entries())
      .map(([topic, clipCount]) => ({
        topic,
        count: clipCount,
        interviewCount: interviewCounts.get(topic).size
      }))
      .sort((a, b) => b.count - a.count);
    
    // Get top 35 topics (we'll display 30 but have extras for flexibility)
    const topTopics = sortedTopics.slice(0, 35);
    
    console.log('Top topics by clip count:');
    topTopics.forEach((item, index) => {
      console.log(`${index + 1}. ${item.topic}: ${item.count} clips across ${item.interviewCount} interviews`);
    });
    
    // Store in Firebase
    const topTopicsData = {
      topics: topTopics,
      calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
      totalTopics: topicCounts.size,
      totalClips: subSummariesSnapshot.size
    };
    
    await db.collection('metadata').doc('topTopics').set(topTopicsData);
    
    console.log('✅ Top topics successfully stored in Firebase!');
    
    // Also save to local file for reference
    fs.writeFileSync('top-topics-result.json', JSON.stringify(topTopicsData, null, 2));
    console.log('📄 Results also saved to top-topics-result.json');
    
    return topTopics;
    
  } catch (error) {
    console.error('❌ Error calculating top topics:', error);
    throw error;
  }
}

// Run the calculation
calculateTopTopics()
  .then(() => {
    console.log('🎉 Process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Process failed:', error);
    process.exit(1);
  });
