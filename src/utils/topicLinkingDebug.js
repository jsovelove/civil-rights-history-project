/**
 * Debugging utilities for Topic Linking feature
 * 
 * Use these functions in the browser console to diagnose linking issues
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Compare topics between TopicLinkedText cache and TopicGlossary data
 * Run this in console: window.debugTopicLinking()
 */
export async function debugTopicLinking() {
  console.log('🔍 Starting Topic Linking Debug...\n');
  
  // Fetch topics from Firestore (same as TopicLinkedText does)
  const eventsAndTopicsCollection = collection(db, 'events_and_topics');
  const eventsSnapshot = await getDocs(eventsAndTopicsCollection);
  
  const topics = eventsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      eventTopic: data.eventTopic,
      keyword: (data.eventTopic || doc.id).toLowerCase(),
      displayName: data.eventTopic || doc.id,
      hasEventTopic: !!data.eventTopic
    };
  });
  
  console.log(`📊 Total topics in Firestore: ${topics.length}\n`);
  
  // Group by whether they have eventTopic
  const withEventTopic = topics.filter(t => t.hasEventTopic);
  const withoutEventTopic = topics.filter(t => !t.hasEventTopic);
  
  console.log(`✅ Topics with eventTopic field: ${withEventTopic.length}`);
  console.log(`⚠️  Topics without eventTopic field: ${withoutEventTopic.length}\n`);
  
  // Show examples
  console.log('📝 Sample topics:');
  topics.slice(0, 10).forEach(topic => {
    console.log(`  - ID: "${topic.id}"`);
    console.log(`    Keyword: "${topic.keyword}"`);
    console.log(`    Display: "${topic.displayName}"`);
    console.log(`    Has eventTopic: ${topic.hasEventTopic}`);
    console.log('');
  });
  
  // Check for ID mismatches
  console.log('🔗 Checking for potential ID issues...');
  const problematicIds = topics.filter(t => {
    return t.id.includes(' ') || 
           t.id.includes('.') || 
           t.id !== t.id.toLowerCase() ||
           t.id.length > 50;
  });
  
  if (problematicIds.length > 0) {
    console.log(`⚠️  Found ${problematicIds.length} topics with potentially problematic IDs:`);
    problematicIds.forEach(t => {
      console.log(`  - "${t.id}" (${t.displayName})`);
    });
  } else {
    console.log('✅ All topic IDs look good!');
  }
  
  // Test a few common topics
  console.log('\n🧪 Testing common topic lookups:');
  const testKeywords = [
    'rosa parks',
    'martin luther king',
    'malcolm x',
    'montgomery',
    'selma',
    'sncc',
    'civil rights movement'
  ];
  
  testKeywords.forEach(keyword => {
    const found = topics.find(t => t.keyword.includes(keyword.toLowerCase()));
    if (found) {
      console.log(`  ✅ "${keyword}" → Found as "${found.displayName}" (ID: ${found.id})`);
    } else {
      console.log(`  ❌ "${keyword}" → Not found`);
    }
  });
  
  return topics;
}

/**
 * Check if a specific topic ID exists in the DOM
 */
export function checkTopicInDOM(topicId) {
  const element = document.getElementById(`topic-${topicId}`);
  if (element) {
    console.log(`✅ Topic "${topicId}" found in DOM`);
    console.log('Element:', element);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  } else {
    console.log(`❌ Topic "${topicId}" NOT found in DOM`);
    console.log('All topic elements:', 
      Array.from(document.querySelectorAll('[id^="topic-"]')).map(el => el.id)
    );
    return false;
  }
}

/**
 * List all topic IDs currently in the DOM
 */
export function listTopicsInDOM() {
  const elements = Array.from(document.querySelectorAll('[id^="topic-"]'));
  console.log(`Found ${elements.length} topic elements in DOM:`);
  elements.forEach(el => {
    const topicId = el.id.replace('topic-', '');
    const topicTitle = el.querySelector('[class*="font-bold"]')?.textContent || 'Unknown';
    console.log(`  - ${topicId}: "${topicTitle}"`);
  });
  return elements.map(el => el.id.replace('topic-', ''));
}

// Make functions available globally for console debugging
if (typeof window !== 'undefined') {
  window.debugTopicLinking = debugTopicLinking;
  window.checkTopicInDOM = checkTopicInDOM;
  window.listTopicsInDOM = listTopicsInDOM;
}


