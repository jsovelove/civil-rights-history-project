/**
 * Convert Large GIFs to Video Format and Upload to Cloudinary
 * 
 * This script:
 * 1. Downloads large GIFs from Firebase Storage
 * 2. Converts them to MP4/WebM (90-95% smaller!)
 * 3. Uploads to Cloudinary as videos
 * 4. Generates URL mapping for code updates
 * 
 * Requirements:
 * - ffmpeg installed (https://ffmpeg.org/download.html)
 * 
 * Usage: node scripts/media/convert-gifs-to-video.js
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is two levels up from scripts/media/
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CLOUDINARY_CONFIG = {
  cloud_name: 'dgbrj4suu',
  api_key: '465367556218672',
  api_secret: 'DHnI8q4T60ordZMU5JgCLzTRWLk',
  folder: 'civil-rights'
};

const VIDEO_FORMAT = 'mp4'; // Options: 'mp4' or 'webm' (mp4 has better browser support)

// Quality settings (lower = smaller file, but still looks great)
const VIDEO_QUALITY = 23; // CRF value: 18-28 is good (23=balanced quality/size)
// Note: We'll preserve the original GIF frame rate instead of forcing a specific FPS

// ============================================================================
// FIREBASE SETUP
// ============================================================================

// Check if Firebase Admin is already initialized
let bucket;
try {
  // Try to get existing app
  const existingApp = admin.app();
  bucket = existingApp.storage().bucket();
} catch (error) {
  // Initialize if not already initialized
  const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'llm-hyper-audio-firebase-adminsdk-fbsvc-fb01161b83.json'), 'utf8')
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'llm-hyper-audio.firebasestorage.app'
  });

  bucket = admin.storage().bucket();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if ffmpeg is installed
 */
function checkFFmpeg() {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    ffmpeg.on('error', () => {
      console.error('❌ ffmpeg is not installed!');
      console.error('\nPlease install ffmpeg:');
      console.error('  Windows: Download from https://ffmpeg.org/download.html');
      console.error('           Or use: winget install ffmpeg');
      console.error('  Mac: brew install ffmpeg');
      console.error('  Linux: sudo apt install ffmpeg\n');
      resolve(false);
    });
    
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Get all large GIF files from Firebase
 */
async function getLargeGifs() {
  console.log('📋 Finding large GIFs in Firebase Storage...');
  
  const [files] = await bucket.getFiles({
    prefix: 'photos/GIFs/'
  });
  
  // Filter for actual GIF files > 10MB
  const largeGifs = files.filter(file => {
    const isGif = file.name.toLowerCase().endsWith('.gif');
    const isLarge = parseInt(file.metadata.size) > 10485760; // 10MB
    const hasSize = file.metadata.size && parseInt(file.metadata.size) > 0;
    return isGif && isLarge && hasSize;
  });
  
  console.log(`✅ Found ${largeGifs.length} large GIFs to convert\n`);
  
  largeGifs.forEach(file => {
    const sizeMB = (parseInt(file.metadata.size) / 1024 / 1024).toFixed(2);
    console.log(`   - ${file.name} (${sizeMB} MB)`);
  });
  
  console.log('');
  return largeGifs;
}

/**
 * Download GIF from Firebase
 */
async function downloadGif(file) {
  const tempDir = path.join(PROJECT_ROOT, 'temp-gif-conversion');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const fileName = path.basename(file.name);
  const tempPath = path.join(tempDir, fileName);
  
  console.log(`   📥 Downloading...`);
  await file.download({ destination: tempPath });
  
  return tempPath;
}

/**
 * Convert GIF to video using ffmpeg
 */
async function convertToVideo(inputPath, outputFormat) {
  const outputPath = inputPath.replace('.gif', `.${outputFormat}`);
  
  console.log(`   🎬 Converting to ${outputFormat.toUpperCase()}...`);
  
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-movflags', 'faststart',
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', // Ensure even dimensions, preserve original fps
      '-c:v', 'libx264',
      '-preset', 'slow', // Better compression
      '-crf', VIDEO_QUALITY.toString(),
      '-vsync', '2', // Preserve all frames
      '-y', // Overwrite output
      outputPath
    ];
    
    // For WebM, use different codec
    if (outputFormat === 'webm') {
      args[9] = 'libvpx-vp9';
      args[10] = '-b:v';
      args[11] = '0';
    }
    
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let lastProgress = '';
    
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      // Extract progress info
      const timeMatch = output.match(/time=(\d+:\d+:\d+)/);
      if (timeMatch) {
        lastProgress = timeMatch[1];
        process.stdout.write(`\r   🎬 Converting: ${lastProgress}`);
      }
    });
    
    ffmpeg.on('close', (code) => {
      process.stdout.write('\r'); // Clear progress line
      if (code === 0) {
        const inputSize = fs.statSync(inputPath).size;
        const outputSize = fs.statSync(outputPath).size;
        const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);
        
        console.log(`   ✅ Converted! Size reduced by ${reduction}% (${(inputSize/1024/1024).toFixed(1)}MB → ${(outputSize/1024/1024).toFixed(1)}MB)`);
        resolve(outputPath);
      } else {
        reject(new Error(`ffmpeg failed with code ${code}`));
      }
    });
    
    ffmpeg.on('error', reject);
  });
}

/**
 * Upload video to Cloudinary
 */
async function uploadToCloudinary(videoPath, originalGifPath) {
  const cloudinary = (await import('cloudinary')).v2;
  
  cloudinary.config({
    cloud_name: CLOUDINARY_CONFIG.cloud_name,
    api_key: CLOUDINARY_CONFIG.api_key,
    api_secret: CLOUDINARY_CONFIG.api_secret
  });
  
  console.log(`   ☁️  Uploading to Cloudinary...`);
  
  // Create public_id from original path
  const publicId = originalGifPath
    .replace('photos/', CLOUDINARY_CONFIG.folder + '/')
    .replace(/\.[^/.]+$/, ''); // Remove extension
  
  const result = await cloudinary.uploader.upload(videoPath, {
    public_id: publicId,
    resource_type: 'video',
    overwrite: true
  });
  
  console.log(`   ✅ Uploaded to Cloudinary!`);
  
  return {
    url: result.secure_url,
    mp4: result.secure_url.replace(/\.[^.]+$/, '.mp4'),
    webm: result.secure_url.replace(/\.[^.]+$/, '.webm')
  };
}

/**
 * Process a single GIF
 */
async function processGif(file) {
  const originalPath = file.name;
  const fileName = path.basename(originalPath);
  const sizeMB = (parseInt(file.metadata.size) / 1024 / 1024).toFixed(2);
  
  console.log(`\n🎯 Processing: ${fileName} (${sizeMB} MB)`);
  
  try {
    // Download GIF
    const localGifPath = await downloadGif(file);
    
    // Convert to video
    const localVideoPath = await convertToVideo(localGifPath, VIDEO_FORMAT);
    
    // Check if video is small enough for Cloudinary free tier
    const videoSize = fs.statSync(localVideoPath).size;
    const videoSizeMB = (videoSize / 1024 / 1024).toFixed(2);
    
    if (videoSize > 10485760) {
      console.log(`   ⚠️  Warning: Video is ${videoSizeMB}MB (still > 10MB limit)`);
      console.log(`   💡 Try lowering VIDEO_QUALITY (current: ${VIDEO_QUALITY})`);
    }
    
    // Upload to Cloudinary
    const urls = await uploadToCloudinary(localVideoPath, originalPath);
    
    // Cleanup temp files
    fs.unlinkSync(localGifPath);
    fs.unlinkSync(localVideoPath);
    
    return {
      originalPath,
      originalSize: sizeMB,
      videoSize: videoSizeMB,
      urls,
      success: true
    };
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return {
      originalPath,
      error: error.message,
      success: false
    };
  }
}

/**
 * Main conversion process
 */
async function main() {
  console.log('🎬 GIF to Video Converter for Cloudinary\n');
  console.log('='.repeat(60));
  
  // Check ffmpeg
  console.log('🔍 Checking for ffmpeg...');
  const hasFFmpeg = await checkFFmpeg();
  
  if (!hasFFmpeg) {
    process.exit(1);
  }
  
  console.log('✅ ffmpeg found!\n');
  console.log('='.repeat(60));
  console.log(`Settings:`);
  console.log(`  Format: ${VIDEO_FORMAT.toUpperCase()}`);
  console.log(`  Quality: CRF ${VIDEO_QUALITY} (lower = higher quality)`);
  console.log(`  FPS: Preserved from original GIF`);
  console.log(`  Preset: slow (better compression)`);
  console.log('='.repeat(60));
  console.log('');
  
  // Get large GIFs
  const gifs = await getLargeGifs();
  
  if (gifs.length === 0) {
    console.log('✅ No large GIFs to convert!');
    return;
  }
  
  console.log(`🚀 Starting conversion of ${gifs.length} GIFs...\n`);
  
  // Process each GIF
  const results = [];
  for (let i = 0; i < gifs.length; i++) {
    console.log(`\n[${ i + 1}/${gifs.length}]`);
    const result = await processGif(gifs[i]);
    results.push(result);
  }
  
  // Generate mapping (written to project root)
  const mapping = {};
  results.forEach(result => {
    if (result.success) {
      mapping[result.originalPath] = result.urls;
    }
  });
  
  const mappingPath = path.join(PROJECT_ROOT, 'gif-to-video-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  
  // Cleanup temp directory
  const tempDir = path.join(PROJECT_ROOT, 'temp-gif-conversion');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalOriginalSize = results.filter(r => r.success).reduce((sum, r) => sum + parseFloat(r.originalSize), 0);
  const totalVideoSize = results.filter(r => r.success).reduce((sum, r) => sum + parseFloat(r.videoSize), 0);
  const savings = ((1 - totalVideoSize / totalOriginalSize) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONVERSION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Mapping file: ${mappingPath}`);
  console.log('');
  console.log('💾 Size Reduction:');
  console.log(`   Original GIFs: ${totalOriginalSize.toFixed(1)} MB`);
  console.log(`   Converted Videos: ${totalVideoSize.toFixed(1)} MB`);
  console.log(`   Savings: ${savings}% smaller!`);
  console.log('='.repeat(60));
  
  if (successful > 0) {
    console.log('\n✨ Conversion complete!\n');
    console.log('📝 Next steps:');
    console.log('1. Review gif-to-video-mapping.json');
    console.log('2. Run: node scripts/media/update-gifs-to-video.js');
    console.log('3. Test your application');
    console.log('4. Enjoy 100% FREE hosting on Cloudinary! 🎉\n');
  }
}

// Run the conversion
main().catch(console.error);




