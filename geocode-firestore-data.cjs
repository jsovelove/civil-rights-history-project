const admin = require('firebase-admin');
const fetch = require('node-fetch');

// ########## CONFIGURATION ##########
// TODO: Replace with the actual path to your Firebase service account key JSON file
const SERVICE_ACCOUNT_KEY_PATH = './llm-hyper-audio-firebase-adminsdk-fbsvc-20605d195b.json'; 
// TODO: Replace with your app name and contact info for the User-Agent header
const USER_AGENT = 'Civil-Rights-History-Project/1.0 (jsovelove@gmail.com)'; 
// TODO: PASTE YOUR LOCATIONIQ API KEY HERE
const LOCATIONIQ_API_KEY = 'pk.8cf908e250c74ed52c7fb05dc9ed813f';
const FIRESTORE_COLLECTION = 'interviewSummaries';
const RATE_LIMIT_DELAY_MS = 1100; // Min 1.1 seconds between requests (LocationIQ free tier allows 2 req/sec)
// ###################################

// Initialize Firebase Admin SDK
try {
  const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK. Ensure SERVICE_ACCOUNT_KEY_PATH is correct and the file exists.');
  console.error(error);
  process.exit(1);
}

const db = admin.firestore();

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Geocoding function using LocationIQ
async function getCoordinates(location) {
  if (!LOCATIONIQ_API_KEY || LOCATIONIQ_API_KEY === 'YOUR_LOCATIONIQ_API_KEY_HERE') {
    console.error('ERROR: Please set your LOCATIONIQ_API_KEY in the script.');
    return null;
  }
  // LocationIQ API endpoint for forward geocoding (v1/search.php)
  const url = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(location)}&format=json`;
  
  try {
    console.log(`Geocoding with LocationIQ: ${location}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT } // User-Agent is good practice, though LocationIQ focuses on the key
    });
    if (!response.ok) {
      // LocationIQ might return errors in the JSON body even for non-200 responses
      let errorData = null;
      try {
        errorData = await response.json();
      } catch (e) { /* ignore if error response is not json */ }
      if (errorData && errorData.error) {
        throw new Error(`LocationIQ API request failed with status ${response.status}: ${errorData.error}`);
      }
      throw new Error(`LocationIQ API request failed with status ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    if (data && data.length > 0) {
      // LocationIQ returns lat/lon as strings, ensure they are parsed to floats
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    console.warn(`No coordinates found for: ${location} using LocationIQ`);
    return null;
  } catch (error) {
    console.error(`Error geocoding ${location} with LocationIQ:`, error.message);
    if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNRESET')) {
      console.warn('Connection timeout or reset. Waiting longer before retrying or check network.');
      await delay(5000); // Wait 5 seconds if timeout
    }
    // Specific LocationIQ error handling can be added here if needed based on errorData.error
    // For example, if (errorData && errorData.error === 'Rate Limited') { await delay(RATE_LIMIT_DELAY_MS * 2); }
    return null; // Don't stop the whole script for one error
  }
}

async function processDocuments() {
  console.log(`Starting geocoding process for collection: ${FIRESTORE_COLLECTION}`);
  const collectionRef = db.collection(FIRESTORE_COLLECTION);
  let snapshot;

  try {
    snapshot = await collectionRef.get();
  } catch (error) {
    console.error('Failed to fetch collection from Firestore:', error);
    process.exit(1);
  }

  if (snapshot.empty) {
    console.log('No documents found in the collection.');
    return;
  }

  console.log(`Found ${snapshot.docs.length} documents to process.`);
  let processedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const doc of snapshot.docs) {
    processedCount++;
    console.log(`
Processing document ${processedCount}/${snapshot.docs.length}: ${doc.id}`);
    const data = doc.data();

    if (data.latitude !== undefined && data.longitude !== undefined) {
      console.log(`Skipping ${doc.id} - already has coordinates.`);
      skippedCount++;
      continue;
    }

    if (!data.birthplace) {
      console.log(`Skipping ${doc.id} - no birthplace field.`);
      skippedCount++;
      continue;
    }

    const coords = await getCoordinates(data.birthplace);

    if (coords) {
      try {
        await doc.ref.update({
          latitude: coords.latitude,
          longitude: coords.longitude
        });
        console.log(`Successfully updated ${doc.id} with coordinates: ${coords.latitude}, ${coords.longitude}`);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update Firestore document ${doc.id}:`, error);
      }
    } else {
      console.log(`Failed to get coordinates for ${doc.id} (birthplace: ${data.birthplace}). Will not update.`);
    }

    // Crucial: Wait before the next Nominatim request
    if (processedCount < snapshot.docs.length) { // Don't delay after the last item
        console.log(`Waiting ${RATE_LIMIT_DELAY_MS / 1000}s before next request...`);
        await delay(RATE_LIMIT_DELAY_MS);
    }
  }

  console.log('\n--- Geocoding Process Summary ---');
  console.log(`Total documents processed: ${processedCount}`);
  console.log(`Documents updated with coordinates: ${updatedCount}`);
  console.log(`Documents skipped (already geocoded or no birthplace): ${skippedCount}`);
  console.log('---------------------------------');
  console.log('Geocoding process finished.');
}

processDocuments().catch(error => {
  console.error("An unexpected error occurred during the script execution:", error);
}); 