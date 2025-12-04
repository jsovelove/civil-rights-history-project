/**
 * @fileoverview TopicLinkedText component - Automatically converts topic keywords into clickable links
 * 
 * This component implements Wikipedia-style auto-linking where any text matching a topic
 * from the topic glossary becomes a clickable link to that topic.
 */

import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

// Global cache for topics to avoid re-fetching
let topicsCache = null;
let topicsCachePromise = null;

/**
 * Fetches all topics from Firestore with caching
 * @returns {Promise<Array>} Array of topic objects with id and keyword
 */
async function fetchTopics() {
  // Return cached data if available
  if (topicsCache) {
    return topicsCache;
  }
  
  // Return pending promise if fetch is in progress
  if (topicsCachePromise) {
    return topicsCachePromise;
  }
  
  // Start new fetch
  topicsCachePromise = (async () => {
    try {
      const eventsAndTopicsCollection = collection(db, 'events_and_topics');
      const eventsSnapshot = await getDocs(eventsAndTopicsCollection);
      
      const topics = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        const keyword = (data.eventTopic || doc.id).toLowerCase();
        const displayName = data.eventTopic || doc.id;
        
        return {
          id: doc.id,
          keyword: keyword,
          displayName: displayName
        };
      });
      
      // Sort by length (longest first) to match longer phrases before shorter ones
      topics.sort((a, b) => b.keyword.length - a.keyword.length);
      
      console.log(`📚 Loaded ${topics.length} topics for linking`);
      console.log('Sample topics:', topics.slice(0, 5).map(t => `"${t.displayName}" (ID: ${t.id})`));
      
      topicsCache = topics;
      topicsCachePromise = null;
      return topics;
    } catch (error) {
      console.error('Error fetching topics for linking:', error);
      topicsCachePromise = null;
      return [];
    }
  })();
  
  return topicsCachePromise;
}

/**
 * Parses text and identifies topic keyword matches
 * @param {string} text - The text to parse
 * @param {Array} topics - Array of topic objects
 * @returns {Array} Array of text segments with link information
 */
function parseTextForTopics(text, topics) {
  if (!text || !topics || topics.length === 0) {
    return [{ text, isLink: false }];
  }
  
  const segments = [];
  const textLower = text.toLowerCase();
  const matches = [];
  
  // Find all matches
  topics.forEach(topic => {
    let startIndex = 0;
    while ((startIndex = textLower.indexOf(topic.keyword, startIndex)) !== -1) {
      const endIndex = startIndex + topic.keyword.length;
      
      // Check if this match overlaps with existing matches
      const overlaps = matches.some(m => 
        (startIndex >= m.start && startIndex < m.end) ||
        (endIndex > m.start && endIndex <= m.end) ||
        (startIndex <= m.start && endIndex >= m.end)
      );
      
      if (!overlaps) {
        // Check word boundaries - ensure match is a complete word/phrase
        const beforeChar = startIndex > 0 ? text[startIndex - 1] : ' ';
        const afterChar = endIndex < text.length ? text[endIndex] : ' ';
        const isWordBoundary = /[\s.,;:!?'"()\[\]{}\-–—]/.test(beforeChar) && 
                               /[\s.,;:!?'"()\[\]{}\-–—]/.test(afterChar);
        
        if (isWordBoundary) {
          const match = {
            start: startIndex,
            end: endIndex,
            topic: topic,
            originalText: text.substring(startIndex, endIndex)
          };
          matches.push(match);
          
          // Debug logging for specific topics
          if (topic.keyword.includes('freedom') || topic.keyword.includes('ride')) {
            console.log(`🔗 Matched "${match.originalText}" to topic:`, {
              keyword: topic.keyword,
              displayName: topic.displayName,
              id: topic.id
            });
          }
        }
      }
      
      startIndex = endIndex;
    }
  });
  
  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);
  
  // Build segments
  let currentIndex = 0;
  matches.forEach(match => {
    // Add text before the match
    if (match.start > currentIndex) {
      segments.push({
        text: text.substring(currentIndex, match.start),
        isLink: false
      });
    }
    
    // Add the matched link
    segments.push({
      text: match.originalText,
      isLink: true,
      topic: match.topic
    });
    
    currentIndex = match.end;
  });
  
  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({
      text: text.substring(currentIndex),
      isLink: false
    });
  }
  
  return segments.length > 0 ? segments : [{ text, isLink: false }];
}

/**
 * TopicLinkedText Component
 * 
 * Renders text with automatic topic keyword linking. Any text matching a topic
 * from the glossary becomes a clickable link that navigates to the playlist builder
 * filtered by that topic.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.children - The text content to parse for topic links
 * @param {string} props.className - Optional CSS classes to apply to the wrapper
 * @param {Object} props.linkClassName - Optional CSS classes for links (can be string or object with hover states)
 * @param {boolean} props.disabled - If true, disables linking (useful for performance testing)
 * 
 * @example
 * <TopicLinkedText className="text-lg">
 *   The Montgomery Bus Boycott was led by Martin Luther King Jr.
 * </TopicLinkedText>
 */
export default function TopicLinkedText({ 
  children, 
  className = '',
  linkClassName = 'text-red-500 hover:underline cursor-pointer',
  disabled = false
}) {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch topics on mount
  useEffect(() => {
    let cancelled = false;
    
    async function loadTopics() {
      const fetchedTopics = await fetchTopics();
      if (!cancelled) {
        setTopics(fetchedTopics);
        setIsLoading(false);
      }
    }
    
    loadTopics();
    
    return () => {
      cancelled = true;
    };
  }, []);
  
  // Parse text for topic matches
  const segments = useMemo(() => {
    if (disabled || isLoading || !children || typeof children !== 'string') {
      return [{ text: children, isLink: false }];
    }
    return parseTextForTopics(children, topics);
  }, [children, topics, disabled, isLoading]);
  
  // Handle link clicks
  const handleTopicClick = (e, topic) => {
    e.preventDefault();
    // Normalize the ID: replace spaces and special chars with hyphens
    const normalizedId = topic.id
      .toLowerCase()
      .replace(/\s+/g, '-')  // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '-')  // Replace special chars with hyphens
      .replace(/-+/g, '-')  // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '');  // Remove leading/trailing hyphens
    
    console.log(`Navigating to topic: "${topic.displayName}"`);
    console.log(`  Original ID: "${topic.id}"`);
    console.log(`  Normalized ID: "${normalizedId}"`);
    
    // Navigate to topic glossary with the normalized ID as a hash
    navigate(`/topic-glossary#${normalizedId}`);
  };
  
  // If disabled or loading, just render the text as-is
  if (disabled || isLoading || typeof children !== 'string') {
    return <span className={className}>{children}</span>;
  }
  
  // Render segments with links
  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.isLink) {
          return (
            <a
              key={index}
              onClick={(e) => handleTopicClick(e, segment.topic)}
              className={linkClassName}
              title={`View clips about "${segment.topic.displayName}"`}
            >
              {segment.text}
            </a>
          );
        } else {
          return <span key={index}>{segment.text}</span>;
        }
      })}
    </span>
  );
}

/**
 * Pre-load topics into cache
 * Call this function early in your app to pre-populate the cache
 */
export async function preloadTopics() {
  return fetchTopics();
}

/**
 * Clear the topics cache
 * Useful for testing or if topics are updated
 */
export function clearTopicsCache() {
  topicsCache = null;
  topicsCachePromise = null;
}

