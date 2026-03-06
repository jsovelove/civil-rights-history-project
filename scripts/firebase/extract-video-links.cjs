const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin SDK with service account
const serviceAccount = require('../../llm-hyper-audio-firebase-adminsdk-fbsvc-fb01161b83.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Extracts all interviewee names and their video embed links from metadataV2 collection
 */
async function extractVideoLinks() {
  console.log('Starting extraction of names and video links...');

  const results = [];
  
  try {
    // Fetch all documents from metadataV2 collection
    const snapshot = await db.collection('metadataV2').get();
    
    console.log(`Found ${snapshot.size} interviewees in metadataV2 collection.`);

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Extract name and videoEmbedLink
      results.push({
        name: data.documentName || 'Unknown',
        videoEmbedLink: data.videoEmbedLink || null
      });
    });

    // Sort by name for easier reading
    results.sort((a, b) => a.name.localeCompare(b.name));

    // Write to JSON file
    const outputFile = 'interviewee-video-links.json';
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

    console.log(`\n✓ Successfully extracted ${results.length} interviewees`);
    console.log(`✓ Results saved to ${outputFile}`);
    
    // Print summary
    const withLinks = results.filter(r => r.videoEmbedLink).length;
    const withoutLinks = results.filter(r => !r.videoEmbedLink).length;
    
    console.log(`\nSummary:`);
    console.log(`  - Total interviewees: ${results.length}`);
    console.log(`  - With video links: ${withLinks}`);
    console.log(`  - Without video links: ${withoutLinks}`);

  } catch (error) {
    console.error('Error extracting video links:', error);
    throw error;
  } finally {
    // Clean up Firebase connection
    await admin.app().delete();
  }
}

// Run the extraction
extractVideoLinks()
  .then(() => {
    console.log('\n✓ Extraction completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Extraction failed:', error);
    process.exit(1);
  });




