/**
 * Script to check current embeddings status and collection source
 * Run this to see what embeddings exist and which collection they're from
 */

import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from './src/services/firebase.js';

async function checkEmbeddingsStatus() {
  console.log('🔍 Checking current embeddings status...\n');
  
  try {
    // Get embeddings collection
    const embeddingsRef = collection(db, 'embeddings');
    const embeddingsQuery = query(embeddingsRef, orderBy('timestamp', 'desc'), limit(10));
    const embeddingsSnapshot = await getDocs(embeddingsQuery);
    
    if (embeddingsSnapshot.empty) {
      console.log('❌ No embeddings found in database');
      console.log('💡 You need to run embedding generation to create vectors');
      return;
    }
    
    console.log(`📊 Found ${embeddingsSnapshot.size} recent embeddings`);
    console.log('\n📋 Sample embeddings analysis:');
    
    let metadataV2Count = 0;
    let legacyCount = 0;
    let hasEnhancedMetadata = 0;
    
    embeddingsSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Embedding ${index + 1} ---`);
      console.log(`ID: ${doc.id}`);
      console.log(`Document: ${data.documentId}`);
      console.log(`Segment: ${data.segmentId || 'N/A'}`);
      console.log(`Created: ${data.timestamp?.toDate?.() || data.createdAt?.toDate?.() || 'Unknown'}`);
      
      // Check for enhanced metadata
      if (data.collection) {
        console.log(`✅ Collection: ${data.collection}`);
        if (data.collection === 'metadataV2') metadataV2Count++;
        else legacyCount++;
      } else {
        console.log(`⚠️  Collection: Unknown (likely legacy)`);
        legacyCount++;
      }
      
      if (data.type || data.mainTopicCategory || data.relatedEvents) {
        console.log(`🚀 Enhanced metadata: YES`);
        hasEnhancedMetadata++;
      } else {
        console.log(`📝 Enhanced metadata: NO`);
      }
      
      if (data.textPreview) {
        console.log(`Preview: "${data.textPreview.substring(0, 100)}..."`);
      }
    });
    
    console.log('\n📈 Summary:');
    console.log(`- MetadataV2 embeddings: ${metadataV2Count}`);
    console.log(`- Legacy embeddings: ${legacyCount}`);
    console.log(`- Enhanced metadata: ${hasEnhancedMetadata}`);
    
    if (hasEnhancedMetadata === 0) {
      console.log('\n🔄 Recommendation: Re-run embedding generation to get enhanced metadata');
    } else if (metadataV2Count < embeddingsSnapshot.size) {
      console.log('\n🔄 Recommendation: Consider re-generating embeddings to ensure all use metadataV2');
    } else {
      console.log('\n✅ All recent embeddings are using metadataV2 with enhanced metadata!');
    }
    
  } catch (error) {
    console.error('❌ Error checking embeddings:', error);
  }
}

// Run the check
checkEmbeddingsStatus();
