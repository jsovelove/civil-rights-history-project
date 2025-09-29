/**
 * Parses a comma-separated string of keywords.
 * @param {string} input - Comma-separated keyword string.
 * @returns {Array} Array of normalized keywords.
 */
export function parseKeywords(input) {
  if (!input) return [];
  return input
    .split(',')
    .map(keyword => keyword.trim().toLowerCase())
    .filter(keyword => keyword.length > 0);
}

/**
 * Extracts YouTube video ID from an embed link.
 * @param {string} videoEmbedLink - YouTube embed URL.
 * @returns {string|null} Video ID or null if not found.
 */
export function extractVideoId(videoEmbedLink) {
  if (!videoEmbedLink) return null;
  const match = videoEmbedLink.match(/embed\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Extracts a timestamp from a formatted string.
 * @param {string} rawTimestamp - Raw timestamp string (possibly with brackets).
 * @returns {string} Clean timestamp in MM:SS or HH:MM:SS format.
 */
export function extractStartTimestamp(rawTimestamp) {
  if (!rawTimestamp) return '00:00';
  const match = rawTimestamp.match(/(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?)/);
  return match ? match[1] : '00:00';
}

/**
 * Converts a timestamp string to seconds.
 * @param {string} timestamp - Timestamp in MM:SS or HH:MM:SS format.
 * @returns {number} Total seconds.
 */
export function convertTimestampToSeconds(timestamp) {
  if (!timestamp) return 0;
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

/**
 * Formats seconds as a timestamp string.
 * @param {number} seconds - Time in seconds.
 * @returns {string} Formatted time string.
 */
export function formatTime(seconds) {
  if (seconds === undefined || seconds === null) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hrs > 0
    ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculates the total duration of all videos in the playlist.
 * @param {Array} videoQueue - Array of video objects.
 * @returns {number} Total duration in seconds.
 */
export function getTotalPlaylistDuration(videoQueue) {
  if (!videoQueue || !Array.isArray(videoQueue)) return 0;
  return videoQueue.reduce((total, video) => {
    if (!video || !video.timestamp) return total;
    const timestamps = video.timestamp.split(' - ');
    if (timestamps.length !== 2) return total;
    const start = convertTimestampToSeconds(extractStartTimestamp(timestamps[0]));
    const end = convertTimestampToSeconds(extractStartTimestamp(timestamps[1]));
    return total + (end - start);
  }, 0);
}

/**
 * Creates a playlist-friendly timestamp range from start and end seconds.
 * @param {number} startSeconds - Start time in seconds.
 * @param {number} endSeconds - End time in seconds.
 * @returns {string} Formatted timestamp range (e.g. "1:20 - 2:45").
 */
export function createTimestampRange(startSeconds, endSeconds) {
  return `${formatTime(startSeconds)} - ${formatTime(endSeconds)}`;
}

/**
 * Parses a timestamp range from a formatted string.
 * Handles both legacy format "[HH:MM:SS - HH:MM:SS]" and metadataV2 format "HH:MM:SS,000 - HH:MM:SS,000".
 * @param {string} timestampRange - Formatted timestamp range (e.g. "1:20 - 2:45" or "01:20:30,000 - 02:45:15,000").
 * @returns {Object} Object with startSeconds and endSeconds properties.
 */
export function parseTimestampRange(timestampRange) {
  if (!timestampRange) return { startSeconds: 0, endSeconds: 0 };
  
  // Remove brackets if present (legacy format)
  const cleanTimestamp = timestampRange.replace(/[\[\]]/g, '');
  
  const parts = cleanTimestamp.split('-').map(part => part.trim());
  if (parts.length !== 2) return { startSeconds: 0, endSeconds: 0 };
  
  // Remove milliseconds if present (metadataV2 format: "HH:MM:SS,000")
  const cleanStart = parts[0].replace(/,\d+$/, '');
  const cleanEnd = parts[1].replace(/,\d+$/, '');
  
  const startSeconds = convertTimestampToSeconds(cleanStart);
  const endSeconds = convertTimestampToSeconds(cleanEnd);
  return { startSeconds, endSeconds };
}
