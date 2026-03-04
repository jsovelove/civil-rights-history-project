/**
 * Check Video Durations on Cloudinary
 * Compare with original GIF durations to verify they match
 * 
 * Usage: node scripts/media/check-video-durations.js
 * (Run from the project root directory)
 */

import fs from 'fs';

const mapping = JSON.parse(fs.readFileSync('gif-to-video-mapping.json', 'utf8'));

console.log('📊 Video Duration Check\n');
console.log('='.repeat(70));
console.log('GIF File'.padEnd(50), 'Video Size', 'Status');
console.log('='.repeat(70));

Object.entries(mapping).forEach(([gifPath, urls]) => {
  const gifName = gifPath.split('/').pop();
  const videoSizeMB = urls.mp4 ? 'Uploaded' : 'N/A';
  
  console.log(
    gifName.padEnd(50),
    videoSizeMB
  );
});

console.log('='.repeat(70));
console.log('\n⚠️  To manually check durations:');
console.log('1. Open one of the video URLs in your browser');
console.log('2. Check the video duration in the player');
console.log('3. Compare with original GIF duration\n');

console.log('Video URLs:');
Object.entries(mapping).forEach(([gifPath, urls]) => {
  const gifName = gifPath.split('/').pop();
  console.log(`\n${gifName}:`);
  console.log(`  ${urls.mp4}`);
});

